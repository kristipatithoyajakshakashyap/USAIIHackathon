"use client";

import { useState, useEffect, useRef } from "react";

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

export function useLiveRisk(cameraId = "CAM-01") {
  const [data, setData] = useState<FrameData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // We keep a history of scores for trend charting
  const [history, setHistory] = useState<{ time: string; score: number; density: number }[]>([]);

  useEffect(() => {
    let simulationInterval: NodeJS.Timeout | null = null;
    let attemptCount = 0;
    const maxAttempts = 2;

    const connect = () => {
      // Avoid connecting if max attempts exceeded, go straight to simulation
      if (attemptCount >= maxAttempts) {
        startSimulation();
        return;
      }

      attemptCount++;
      const wsUrl = `ws://localhost:8000/live-risk?video=mock_cctv.mp4&scene=1&audio=1`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsSimulated(false);
        console.log("Connected to PREVAIL Live WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as FrameData;
          setData({ ...parsed, camera_id: cameraId });
          updateHistory(parsed.risk.score, parsed.persons.length);
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onerror = () => {
        console.warn("WebSocket error, falling back to simulator");
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Connect failed or closed, fall back to simulator
        startSimulation();
      };
    };

    const updateHistory = (score: number, peopleCount: number) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory(prev => {
        const next = [...prev, { time: timeStr, score, density: peopleCount }];
        if (next.length > 30) next.shift();
        return next;
      });
    };

    const startSimulation = () => {
      setIsConnected(true);
      setIsSimulated(true);
      
      let frameIndex = 0;
      let baseScore = 20; // safe baseline
      let targetScore = 20;
      let stepsToTarget = 0;

      // Keep tracking a list of 2-4 mock people moving in a 640x480 space
      const people = [
        { id: 1, x: 150, y: 200, vx: 2, vy: 1 },
        { id: 2, x: 200, y: 220, vx: -2, vy: -1.5 },
        { id: 3, x: 450, y: 180, vx: 1, vy: 2 },
        { id: 4, x: 500, y: 300, vx: -1, vy: -1 }
      ];

      simulationInterval = setInterval(() => {
        frameIndex++;
        const ts = frameIndex * 0.1; // 10 FPS equivalent

        // Periodically trigger escalation scenarios for demo interest
        if (stepsToTarget <= 0) {
          const rand = Math.random();
          if (rand > 0.85) {
            // Escalation to High/Critical
            targetScore = 75 + Math.floor(Math.random() * 20);
            stepsToTarget = 30; // Escalates over 6 seconds
          } else if (rand > 0.6) {
            // Moderate fluctuation
            targetScore = 40 + Math.floor(Math.random() * 25);
            stepsToTarget = 20;
          } else {
            // Return to safe
            targetScore = 15 + Math.floor(Math.random() * 15);
            stepsToTarget = 15;
          }
        } else {
          baseScore += (targetScore - baseScore) / stepsToTarget;
          stepsToTarget--;
        }

        const score = Math.max(0, Math.min(100, Math.round(baseScore)));
        
        // Update person positions (bouncing off mock boundary box)
        const isEscalated = score > 60;
        const speedMultiplier = isEscalated ? 3 : 1;

        const currentPersons: Person[] = people.map(p => {
          p.x += p.vx * speedMultiplier + (Math.random() - 0.5) * 2;
          p.y += p.vy * speedMultiplier + (Math.random() - 0.5) * 2;

          if (p.x < 50 || p.x > 590) p.vx *= -1;
          if (p.y < 50 || p.y > 430) p.vy *= -1;

          // Generate a mock keypoint pose skeleton
          // 12 points: head, shoulders, elbows, wrists, hips
          const pose: [number, number, number][] = [
            [p.x, p.y - 40, 0.9], // head
            [p.x, p.y - 20, 0.95], // neck
            [p.x - 15, p.y - 15, 0.9], // L shoulder
            [p.x + 15, p.y - 15, 0.9], // R shoulder
            [p.x - 25, p.y + (isEscalated && p.id === 1 ? -40 : 5), 0.85], // L elbow (arms up if escalated)
            [p.x + 25, p.y + (isEscalated && p.id === 2 ? -45 : 5), 0.85], // R elbow
            [p.x - 30, p.y + (isEscalated && p.id === 1 ? -60 : 20), 0.8], // L wrist
            [p.x + 30, p.y + (isEscalated && p.id === 2 ? -65 : 20), 0.8], // R wrist
            [p.x - 10, p.y + 30, 0.9], // L hip
            [p.x + 10, p.y + 30, 0.9], // R hip
            [p.x - 15, p.y + 70, 0.8], // L knee
            [p.x + 15, p.y + 70, 0.8]  // R knee
          ];

          return {
            track_id: p.id,
            bbox: [p.x - 30, p.y - 50, 60, 130],
            conf: 0.88 + Math.random() * 0.1,
            pose
          };
        });

        // Determine band
        let band: Risk["band"] = "SAFE";
        let reasons: string[] = ["Normal movement", "Safe crowd density"];
        if (score > 90) {
          band = "CRITICAL";
          reasons = ["Violent posture", "Sudden running patterns", "Aggressive speech frequency", "High vocal intensity"];
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

        // Generate features
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

        // SHAP contributions (must sum roughly to score offset)
        const contributions = {
          "Pose Aggression": Math.round((features.pose_aggression * 30) * (score / 100)),
          "Movement Speed": Math.round((features.speed * 4) * (score / 100)),
          "Vocal Intensity": Math.round((features.audio_intensity * 25) * (score / 100)),
          "Audio Anger": Math.round((features.audio_anger * 25) * (score / 100)),
          "Crowd Density": Math.round((features.crowd_density * 10)),
          "Proximity/Convergence": Math.round((features.proximity * 15))
        };

        const simulatedFrame: FrameData = {
          frame_index: frameIndex,
          timestamp: parseFloat(ts.toFixed(2)),
          persons: currentPersons,
          features,
          risk: {
            score,
            band,
            reasons,
            contributions
          },
          proc_fps: 12.4 + Math.random() * 0.8,
          camera_id: cameraId
        };

        setData(simulatedFrame);
        updateHistory(score, currentPersons.length);
      }, 200); // 5 FPS
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [cameraId]);

  return { data, isConnected, isSimulated, history };
}
