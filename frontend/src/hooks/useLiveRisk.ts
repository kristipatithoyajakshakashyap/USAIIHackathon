"use client";

/**
 * useLiveRisk
 *
 * Manages the full lifecycle of one camera/session across two operational modes:
 *
 *   DEMO_VIDEO mode:
 *     uploadVideo(file) → POST /upload → serverPath
 *     → WS /live-risk → real per-frame inference data
 *
 *   LIVE_CAMERA mode:
 *     getUserMedia() → MediaStream → <video> srcObject (local display)
 *     → simulation provides risk telemetry (backend cannot ingest webcam frames
 *       without a dedicated ingest endpoint — see RTSP_CAMERA for future work)
 *
 * Architecture:
 *   page.tsx  →  useLiveRisk  →  lib/prevail.ts  →  FastAPI backend
 *
 * Adding a new mode (e.g. RTSP_CAMERA) requires:
 *   1. Add the enum value to lib/prevail.ts InputSource
 *   2. Add one new API function to lib/prevail.ts
 *   3. Add one case to the switchSource() function in this hook
 *   4. Zero changes to any UI component
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  InputSource,
  uploadVideo as apiUploadVideo,
  openLiveRisk,
  health,
  startWebcam,
  stopWebcam,
  type WsFrame,
  type WsPerson,
} from "@/lib/prevail";

// ── Re-exported types (consumed by page components) ───────────────────────────

export { InputSource };

export interface Person {
  track_id: number;
  bbox: [number, number, number, number];
  conf: number;
  pose?: [number, number, number][]; // x, y, confidence
}

export interface Risk {
  score: number;
  band: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  reasons: string[];
  contributions: Record<string, number>;
}

export interface FrameData {
  frame_index: number;
  timestamp: number;
  persons: Person[];
  features: Record<string, number>;
  risk: Risk;
  proc_fps: number;
  camera_id?: string;
}

export type HistoryEntry = { time: string; score: number; density: number };

// ── Internal constants ────────────────────────────────────────────────────────

const MAX_HISTORY = 30;
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 3;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveRisk(cameraId = "CAM-01") {
  // ── Live telemetry state ─────────────────────────────────────────────────
  const [data, setData] = useState<FrameData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // ── Upload / Demo Video state ────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  // ── Input source state ───────────────────────────────────────────────────
  const [inputSource, setInputSourceState] = useState<InputSource>(
    InputSource.DEMO_VIDEO
  );

  // ── Webcam state ─────────────────────────────────────────────────────────
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isStartingWebcam, setIsStartingWebcam] = useState(false);

  // ── Internal refs ────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const serverPathRef = useRef<string | null>(null);
  const isSimulatingRef = useRef(false);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const updateHistory = useCallback((score: number, peopleCount: number) => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setHistory((prev) => {
      const next = [...prev, { time: timeStr, score, density: peopleCount }];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
  }, []);

  /** Cleanly close the current WebSocket and cancel any pending reconnect. */
  const closeWebSocket = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /** Stop the simulator loop. */
  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    isSimulatingRef.current = false;
  }, []);

  /** Stop the active webcam and release the camera hardware. */
  const stopWebcamStream = useCallback(() => {
    if (webcamStreamRef.current) {
      stopWebcam(webcamStreamRef.current);
      webcamStreamRef.current = null;
    }
    setWebcamStream(null);
  }, []);

  // ── Simulation (preserved exactly from original implementation) ───────────

  const startSimulation = useCallback(() => {
    stopSimulation();
    closeWebSocket();

    setIsConnected(true);
    setIsSimulated(true);
    isSimulatingRef.current = true;

    let frameIndex = 0;
    let baseScore = 20;
    let targetScore = 20;
    let stepsToTarget = 0;

    const people = [
      { id: 1, x: 150, y: 200, vx: 2, vy: 1 },
      { id: 2, x: 200, y: 220, vx: -2, vy: -1.5 },
      { id: 3, x: 450, y: 180, vx: 1, vy: 2 },
      { id: 4, x: 500, y: 300, vx: -1, vy: -1 },
    ];

    simulationRef.current = setInterval(() => {
      frameIndex++;
      const ts = frameIndex * 0.1;

      if (stepsToTarget <= 0) {
        const rand = Math.random();
        if (rand > 0.85) {
          targetScore = 75 + Math.floor(Math.random() * 20);
          stepsToTarget = 30;
        } else if (rand > 0.6) {
          targetScore = 40 + Math.floor(Math.random() * 25);
          stepsToTarget = 20;
        } else {
          targetScore = 15 + Math.floor(Math.random() * 15);
          stepsToTarget = 15;
        }
      } else {
        baseScore += (targetScore - baseScore) / stepsToTarget;
        stepsToTarget--;
      }

      const score = Math.max(0, Math.min(100, Math.round(baseScore)));
      const isEscalated = score > 60;
      const speedMultiplier = isEscalated ? 3 : 1;

      const currentPersons: Person[] = people.map((p) => {
        p.x += p.vx * speedMultiplier + (Math.random() - 0.5) * 2;
        p.y += p.vy * speedMultiplier + (Math.random() - 0.5) * 2;

        if (p.x < 50 || p.x > 590) p.vx *= -1;
        if (p.y < 50 || p.y > 430) p.vy *= -1;

        const pose: [number, number, number][] = [
          [p.x, p.y - 40, 0.9],
          [p.x, p.y - 20, 0.95],
          [p.x - 15, p.y - 15, 0.9],
          [p.x + 15, p.y - 15, 0.9],
          [p.x - 25, p.y + (isEscalated && p.id === 1 ? -40 : 5), 0.85],
          [p.x + 25, p.y + (isEscalated && p.id === 2 ? -45 : 5), 0.85],
          [p.x - 30, p.y + (isEscalated && p.id === 1 ? -60 : 20), 0.8],
          [p.x + 30, p.y + (isEscalated && p.id === 2 ? -65 : 20), 0.8],
          [p.x - 10, p.y + 30, 0.9],
          [p.x + 10, p.y + 30, 0.9],
          [p.x - 15, p.y + 70, 0.8],
          [p.x + 15, p.y + 70, 0.8],
        ];

        return {
          track_id: p.id,
          bbox: [p.x - 30, p.y - 50, 60, 130],
          conf: 0.88 + Math.random() * 0.1,
          pose,
        };
      });

      let band: Risk["band"] = "SAFE";
      let reasons: string[] = ["Normal movement", "Safe crowd density"];
      if (score > 90) {
        band = "CRITICAL";
        reasons = [
          "Violent posture",
          "Sudden running patterns",
          "Aggressive speech frequency",
          "High vocal intensity",
        ];
      } else if (score > 75) {
        band = "HIGH";
        reasons = ["Raised arms gesture", "High acceleration", "Angry audio tone detected"];
      } else if (score > 50) {
        band = "MODERATE";
        reasons = ["Crowd convergence detected", "Rapid movements", "Fear audio emotion spike"];
      } else if (score > 25) {
        band = "LOW";
        reasons = ["Mild physical acceleration", "Crowd density increase"];
      }

      const features = {
        pose_aggression: isEscalated ? 0.72 + Math.random() * 0.2 : 0.12 + Math.random() * 0.15,
        speed: isEscalated ? 4.5 + Math.random() * 2 : 1.1 + Math.random() * 0.6,
        acceleration: isEscalated ? 2.1 + Math.random() * 1.5 : 0.2 + Math.random() * 0.3,
        crowd_density: 0.35 + Math.random() * 0.1,
        proximity: isEscalated ? 0.85 + Math.random() * 0.1 : 0.25 + Math.random() * 0.15,
        audio_anger: score > 75 ? 0.81 + Math.random() * 0.15 : 0.05 + Math.random() * 0.1,
        audio_fear: score > 50 ? 0.62 + Math.random() * 0.2 : 0.08 + Math.random() * 0.1,
        audio_intensity: score > 50 ? 0.78 + Math.random() * 0.18 : 0.22 + Math.random() * 0.12,
      };

      const contributions = {
        "Pose Aggression": Math.round(features.pose_aggression * 30 * (score / 100)),
        "Movement Speed": Math.round(features.speed * 4 * (score / 100)),
        "Vocal Intensity": Math.round(features.audio_intensity * 25 * (score / 100)),
        "Audio Anger": Math.round(features.audio_anger * 25 * (score / 100)),
        "Crowd Density": Math.round(features.crowd_density * 10),
        "Proximity/Convergence": Math.round(features.proximity * 15),
      };

      const simulatedFrame: FrameData = {
        frame_index: frameIndex,
        timestamp: parseFloat(ts.toFixed(2)),
        persons: currentPersons,
        features,
        risk: { score, band, reasons, contributions },
        proc_fps: 12.4 + Math.random() * 0.8,
        camera_id: cameraId,
      };

      setData(simulatedFrame);
      updateHistory(score, currentPersons.length);
    }, 200);
  }, [cameraId, updateHistory, stopSimulation, closeWebSocket]);

  // ── WebSocket connection ──────────────────────────────────────────────────

  const connectWebSocket = useCallback(
    (serverPath: string) => {
      if (isSimulatingRef.current) return;

      closeWebSocket();

      const ws = openLiveRisk(
        serverPath,
        (frame: WsFrame) => {
          const enriched: FrameData = {
            ...frame,
            camera_id: cameraId,
            persons: frame.persons.map((p: WsPerson) => ({
              track_id: p.track_id,
              bbox: p.bbox,
              conf: p.conf,
            })),
            risk: {
              score: frame.risk.score,
              band: frame.risk.band as Risk["band"],
              reasons: frame.risk.reasons,
              contributions: frame.risk.contributions,
            },
          };
          setData(enriched);
          updateHistory(frame.risk.score, frame.persons.length);
        },
        (_event: Event) => {
          console.warn("[PREVAIL] WebSocket error");
        },
        (_event: CloseEvent) => {
          setIsConnected(false);
          if (isSimulatingRef.current) return;
          if (!serverPathRef.current) return;

          if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectCountRef.current += 1;
            console.info(
              `[PREVAIL] WS closed. Reconnect ${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY_MS}ms…`
            );
            reconnectRef.current = setTimeout(() => {
              if (serverPathRef.current) connectWebSocket(serverPathRef.current);
            }, RECONNECT_DELAY_MS);
          } else {
            console.warn("[PREVAIL] Max reconnects reached. Falling back to simulation.");
            startSimulation();
          }
        }
      );

      ws.onopen = () => {
        setIsConnected(true);
        setIsSimulated(false);
        reconnectCountRef.current = 0;
        console.info("[PREVAIL] WebSocket connected.");
      };

      wsRef.current = ws;
    },
    [cameraId, updateHistory, closeWebSocket, startSimulation]
  );

  // ── Initial mount ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const tryBackend = async () => {
      try {
        await health();
        if (!cancelled) startSimulation();
      } catch {
        if (!cancelled) {
          console.info("[PREVAIL] Backend unreachable on init. Simulating.");
          startSimulation();
        }
      }
    };

    tryBackend();

    return () => {
      cancelled = true;
      closeWebSocket();
      stopSimulation();
      stopWebcamStream();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  // ── Source switching ──────────────────────────────────────────────────────

  /**
   * Switch the input source. Tears down the current source cleanly,
   * then initialises the new one.
   *
   * To add a new source:
   *   1. Add its enum value to lib/prevail.ts InputSource
   *   2. Add a new case here
   */
  const setInputSource = useCallback(
    (next: InputSource) => {
      // ── Teardown current source ──────────────────────────────────────────
      stopWebcamStream();
      closeWebSocket();
      stopSimulation();
      serverPathRef.current = null;
      reconnectCountRef.current = 0;
      setUploadError(null);
      setWebcamError(null);
      setVideoObjectUrl(null);
      setData(null);

      setInputSourceState(next);

      // ── Initialise new source ────────────────────────────────────────────
      switch (next) {
        case InputSource.DEMO_VIDEO:
          // Nothing to initialise; user will click "Upload Video"
          // Start simulation so the UI is not blank
          startSimulation();
          break;

        case InputSource.LIVE_CAMERA:
          // Webcam is started by startLiveCamera() (user clicks the button)
          // Start simulation immediately for the risk panels
          startSimulation();
          break;

        case InputSource.RTSP_CAMERA:
          // Future: would open a dedicated backend ingest WS
          // For now, fall through to simulation
          startSimulation();
          break;
      }
    },
    [stopWebcamStream, closeWebSocket, stopSimulation, startSimulation]
  );

  // ── Demo Video: upload ────────────────────────────────────────────────────

  /**
   * uploadVideo(file)
   * Called by the UI when the user picks a video file in DEMO_VIDEO mode.
   */
  const uploadVideo = useCallback(
    async (file: File) => {
      setUploadError(null);
      setIsUploading(true);

      stopSimulation();
      closeWebSocket();
      reconnectCountRef.current = 0;

      // Revoke previous object URL
      setVideoObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      try {
        const { path } = await apiUploadVideo(file);
        serverPathRef.current = path;
        connectWebSocket(path);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Upload failed — unknown error";
        console.error("[PREVAIL] Upload error:", message);
        setUploadError(message);
        serverPathRef.current = null;
        startSimulation();
      } finally {
        setIsUploading(false);
      }
    },
    [connectWebSocket, stopSimulation, closeWebSocket, startSimulation]
  );

  // ── Live Camera: start/stop ───────────────────────────────────────────────

  /**
   * startLiveCamera()
   * Called by the UI when the user clicks "Start Live Monitoring".
   * Acquires webcam access and assigns the MediaStream to the <video> element.
   * Risk panels continue from simulation (backend cannot ingest webcam frames
   * without a dedicated /live-stream-ingest endpoint).
   */
  const startLiveCamera = useCallback(async () => {
    setWebcamError(null);
    setIsStartingWebcam(true);

    // Stop any previous webcam stream
    stopWebcamStream();

    try {
      const stream = await startWebcam();
      webcamStreamRef.current = stream;
      setWebcamStream(stream);
      // Simulation already running from setInputSource(LIVE_CAMERA);
      // no need to restart it here.
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Camera unavailable";
      console.error("[PREVAIL] Webcam error:", message);
      setWebcamError(message);
    } finally {
      setIsStartingWebcam(false);
    }
  }, [stopWebcamStream]);

  /**
   * stopLiveCamera()
   * Releases the camera hardware and returns to simulation-only mode.
   */
  const stopLiveCamera = useCallback(() => {
    stopWebcamStream();
    setWebcamError(null);
    // Simulation continues in the background automatically
  }, [stopWebcamStream]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      closeWebSocket();
      stopSimulation();
      stopWebcamStream();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // Telemetry
    data,
    isConnected,
    isSimulated,
    history,

    // Upload (Demo Video mode)
    isUploading,
    uploadError,
    videoObjectUrl,
    uploadVideo,

    // Input source
    inputSource,
    setInputSource,

    // Webcam (Live Camera mode)
    webcamStream,
    webcamError,
    isStartingWebcam,
    startLiveCamera,
    stopLiveCamera,
  } as const;
}
