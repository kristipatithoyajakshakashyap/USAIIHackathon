from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from prevail.security.rate_limiter import limiter, rate_limit_exceeded_handler
from prevail.auth.auth_routes import router as auth_router

app = FastAPI(
    title="PREVAIL API",
    description="Predictive Violence & Aggression Escalation Intelligence Layer",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/")
@limiter.limit("60/minute")
def root(request: Request):
    return {"message": "PREVAIL API is running"}


@app.get("/health")
@limiter.limit("60/minute")
def health(request: Request):
    return {"status": "healthy", "system": "PREVAIL"}


@app.post("/predict")
@limiter.limit("10/minute")
def predict(request: Request):
    return {"message": "Prediction endpoint - limited to 10 per minute"}


@app.post("/upload")
@limiter.limit("5/minute")
def upload(request: Request):
    return {"message": "Upload endpoint - limited to 5 per minute"}