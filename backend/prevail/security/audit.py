import time
import logging
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, Float
import os

# ── Database setup ──────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./prevail_audit.db")

engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# ── Audit log table ─────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address  = Column(String)
    method      = Column(String)
    endpoint    = Column(String)
    user_id     = Column(String, nullable=True)
    status_code = Column(Integer)
    duration_ms = Column(Float)

# ── Create table on startup ─────────────────────────────────────
async def init_audit_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ── Middleware ──────────────────────────────────────────────────
class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()

        response = await call_next(request)

        duration = (time.perf_counter() - start) * 1000

        user_id = getattr(request.state, "user_id", "anonymous")

        try:
            async with AsyncSessionLocal() as session:
                log = AuditLog(
                    ip_address  = request.client.host,
                    method      = request.method,
                    endpoint    = str(request.url.path),
                    user_id     = user_id,
                    status_code = response.status_code,
                    duration_ms = round(duration, 2),
                )
                session.add(log)
                await session.commit()
        except Exception as e:
            logging.error(f"Audit log failed: {e}")

        return response