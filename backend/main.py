import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, cases, sessions, reports, users, admin, flashcards, questions, microscope, emergency_mcq, learning, pharma
from app.api.practice_mcq import router as practice_mcq_router


class _PreflightCorsMethodNormalizeMiddleware:
    """
    Starlette'ın CORS preflight'ı, allow_methods eşleşmesini büyük harfle yapar.
    Bazı webview'lar (ör. WKWebView) Access-Control-Request-Method: post gönderir; bu
    da 'Disallowed CORS method' + HTTP 400 üretir. OPTIONS gövdesine gelmeden düzelt.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope.get("method") == "OPTIONS":
            headers: list = []
            for k, v in scope.get("headers", []):
                if k.lower() == b"access-control-request-method" and v:
                    try:
                        m = v.decode("latin-1").strip().upper()
                    except (UnicodeDecodeError, ValueError):
                        m = ""
                    v = m.encode("latin-1") if m else v
                headers.append((k, v))
            scope = {**scope, "headers": headers}
        await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    import logging
    logger = logging.getLogger("uvicorn")
    logger.info("=" * 50)
    logger.info("🚀 KLINIKIQ BACKEND STARTING")
    logger.info(f"📡 ALLOWED CORS ORIGINS: {settings.BACKEND_CORS_ORIGINS}")
    logger.info("📡 CORS allow_origin_regex: ^https?://tauri\\.localhost(:\\d+)?$")
    logger.info("=" * 50)

    yield
    await engine.dispose()

app = FastAPI(
    title="KlinikIQ API",
    description="TUS Hazırlık Platformu — AI destekli hasta simülasyonu",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://tauri\.localhost(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(_PreflightCorsMethodNormalizeMiddleware)

from fastapi.staticfiles import StaticFiles

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
app.include_router(microscope.router, prefix="/api/microscope", tags=["Microscope"])
app.include_router(emergency_mcq.router, prefix="/api/emergency-mcq", tags=["Emergency MCQ"])
app.include_router(practice_mcq_router, prefix="/api/practice-mcq", tags=["practice-mcq"])
app.include_router(learning.router, prefix="/api/learning", tags=["Learning"])
app.include_router(pharma.router, prefix="/api/pharma", tags=["Pharma"])

if not os.path.exists(settings.TILES_DIR):
    os.makedirs(settings.TILES_DIR, exist_ok=True)

app.mount("/tiles", StaticFiles(directory=settings.TILES_DIR), name="tiles")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "KlinikIQ Backend"}
