/**
 * PREVAIL API Client
 *
 * Typed HTTP + WebSocket client for the FastAPI backend.
 * All network logic is centralised here so hooks and components stay free
 * of raw fetch/WebSocket construction.
 *
 * Environment variables (set in .env.local):
 *   NEXT_PUBLIC_API_URL   – defaults to http://localhost:8000
 *   NEXT_PUBLIC_WS_URL    – defaults to ws://localhost:8000
 */

// ── Base URLs ──────────────────────────────────────────────────────────────────
export const BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const WS_URL: string =
  process.env.NEXT_PUBLIC_WS_URL ??
  BASE_URL.replace(/^http/, "ws");

// ── Input Source ───────────────────────────────────────────────────────────────
/**
 * Describes where the video feed originates.
 * Extend this enum to add new sources (e.g. RTSP_CAMERA) without touching
 * any other file in the codebase.
 *
 *  DEMO_VIDEO   – user uploads an mp4 → POST /upload → WS /live-risk (real inference)
 *  LIVE_CAMERA  – browser webcam via getUserMedia (local display; simulation provides risk)
 *  RTSP_CAMERA  – future: backend ingest endpoint receives RTSP stream
 */
export enum InputSource {
  DEMO_VIDEO  = "DEMO_VIDEO",
  LIVE_CAMERA = "LIVE_CAMERA",
  RTSP_CAMERA = "RTSP_CAMERA", // reserved for future use
}

/** Human-readable label for each source (for the UI selector) */
export const INPUT_SOURCE_LABELS: Record<InputSource, string> = {
  [InputSource.DEMO_VIDEO]:  "Demo Video",
  [InputSource.LIVE_CAMERA]: "Live Camera",
  [InputSource.RTSP_CAMERA]: "RTSP / CCTV",
};

// ── Typed response shapes ──────────────────────────────────────────────────────

/** Response from GET /health */
export interface HealthResponse {
  success: boolean;
  status: string;
  device: string;
  risk_head: string;
}

/** Response from POST /upload */
export interface UploadResponse {
  success: boolean;
  path: string;
}

/** Per-person bounding box payload from the WebSocket stream */
export interface WsPerson {
  track_id: number;
  bbox: [number, number, number, number]; // x, y, w, h in source-video pixels
  conf: number;
}

/** Risk block inside each WebSocket frame */
export interface WsRisk {
  score: number;
  band: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  reasons: string[];
  contributions: Record<string, number>;
}

/** Full per-frame message emitted by WS /live-risk */
export interface WsFrame {
  frame_index: number;
  timestamp: number;
  persons: WsPerson[];
  features: Record<string, number>;
  risk: WsRisk;
  proc_fps: number;
  camera_id?: string;
  /** Present only when the server cannot open the video */
  error?: string;
}

// ── API functions ──────────────────────────────────────────────────────────────

/**
 * GET /health
 * Returns backend liveness info. Throws on network failure.
 */
export async function health(): Promise<HealthResponse> {
  const response = await fetch(`${BASE_URL}/health`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<HealthResponse>;
}

/**
 * POST /upload
 * Uploads a video file to the server. The browser sets the multipart
 * boundary automatically — do NOT set Content-Type manually.
 * Returns the server-side absolute path of the saved file.
 */
export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
    // ⚠ Do NOT set Content-Type — the browser sets multipart + boundary
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Upload failed (${response.status} ${response.statusText})${text ? `: ${text}` : ""}`
    );
  }

  const data = (await response.json()) as UploadResponse;
  if (!data.success) {
    throw new Error("Server rejected the upload (success: false)");
  }
  return data;
}

/**
 * Opens a WebSocket to WS /live-risk?video=<serverPath>
 *
 * @param serverPath   Absolute path returned by uploadVideo()
 * @param onFrame      Called for every valid WsFrame message
 * @param onError      Called when the socket emits an error event
 * @param onClose      Called when the socket closes (code, reason)
 * @returns            The raw WebSocket instance so callers can close it
 */
export function openLiveRisk(
  serverPath: string,
  onFrame: (frame: WsFrame) => void,
  onError?: (event: Event) => void,
  onClose?: (event: CloseEvent) => void
): WebSocket {
  const url = `${WS_URL}/live-risk?video=${encodeURIComponent(serverPath)}`;
  const ws = new WebSocket(url);

  ws.onmessage = (event: MessageEvent<string>) => {
    try {
      const parsed = JSON.parse(event.data) as WsFrame;
      // Surface server-side errors (e.g. "video not found") to the caller
      if (parsed.error) {
        onError?.(new ErrorEvent("error", { message: parsed.error }));
        return;
      }
      onFrame(parsed);
    } catch {
      // Silently drop unparseable frames to keep the stream alive
      console.warn("[PREVAIL] Failed to parse WS frame:", event.data);
    }
  };

  ws.onerror = (event: Event) => {
    onError?.(event);
  };

  ws.onclose = (event: CloseEvent) => {
    onClose?.(event);
  };

  return ws;
}

// ── Webcam utilities ───────────────────────────────────────────────────────────

/**
 * Requests webcam access via getUserMedia and returns the MediaStream.
 * Throws a descriptive error if permission is denied or the device is unavailable.
 *
 * NOTE: getUserMedia requires HTTPS in production; it works over HTTP on localhost.
 */
export async function startWebcam(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera API unavailable. Ensure the page is served over HTTPS and the browser supports getUserMedia."
    );
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError") {
        throw new Error("Camera permission denied. Please allow camera access and try again.");
      }
      if (err.name === "NotFoundError") {
        throw new Error("No camera found on this device.");
      }
    }
    throw new Error("Could not access camera. Please check your device settings.");
  }
}

/**
 * Stops all video tracks of an active MediaStream, releasing the camera.
 */
export function stopWebcam(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
