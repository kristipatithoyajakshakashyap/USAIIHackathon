"""
rate_limit.py
Rate limiting using slowapi to prevent abuse of heavy AI endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Limits requests per IP address (or per-user if you key it off JWT instead)
limiter = Limiter(key_func=get_remote_address)

# Suggested limits — apply per endpoint with a decorator:
#   @limiter.limit("10/minute")
#   @app.post("/analyze")
#   def analyze(...): ...
#
# Heavy AI endpoints (analyze, predict, analyze-audio): 10/minute
# Light endpoints (health, upload):                     60/minute