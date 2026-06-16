"""
inference_guard.py
Ensures all AI inference runs server-side only.
Blocks any request that tries to send raw model inputs (tensors, embeddings)
directly — clients can only send video/audio files.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# File types allowed — only media files, never raw model data
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wav", ".flac", ".ogg", ".mp3"}

# Blocked content types — these suggest someone is sending raw tensor/model data
BLOCKED_CONTENT_TYPES = {
    "application/octet-stream",
    "application/x-numpy",
    "application/x-pickle",
    "application/x-pytorch",
}


class InferenceGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):

        # only check file upload endpoints
        if request.url.path in ("/analyze", "/upload", "/analyze-audio", "/predict"):

            content_type = request.headers.get("content-type", "")

            # block raw tensor/model data uploads
            for blocked in BLOCKED_CONTENT_TYPES:
                if blocked in content_type:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": "Direct model input rejected.",
                            "detail": "Send a video or audio file only. Server handles all AI inference."
                        }
                    )

        response = await call_next(request)
        return response


def validate_file_extension(filename: str) -> bool:
    """Call this inside any endpoint to double-check the uploaded file type."""
    from pathlib import Path
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS