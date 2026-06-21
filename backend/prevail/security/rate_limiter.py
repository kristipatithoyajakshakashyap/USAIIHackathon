from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Creates the limiter using the user's IP address
limiter = Limiter(key_func=get_remote_address)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    What happens when someone hits the limit.
    Returns a clear error message instead of crashing.
    """
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": "60 seconds"
        }
    )


# Rate limit rules for PREVAIL endpoints
# Format: "number of requests per time period"
LIMITS = {
    "predict": "10/minute",    # AI prediction — expensive, limit strictly
    "upload": "5/minute",      # File upload — bandwidth heavy
    "alerts": "30/minute",     # Viewing alerts — more lenient
    "default": "60/minute"     # Everything else
}