import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.paths import community_uploads_abs
from app.core.database import engine, Base
from app.api import auth, cases, sessions, reports, users, admin, flashcards, questions, microscope, community, drugs, antibiotics, emergency_mcq, learning
from app.api.practice_mcq import router as practice_mcq_router


def _ensure_community_notes_moderation_column(sync_conn) -> None:
    """Mevcut veritabanına moderation_status sütunu ekler (create_all yeni tablolara ekler)."""
    from sqlalchemy import inspect, text

    insp = inspect(sync_conn)
    if "community_notes" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("community_notes")}
    if "moderation_status" in cols:
        return
    dialect = sync_conn.dialect.name
    if dialect == "sqlite":
        sync_conn.execute(
            text(
                "ALTER TABLE community_notes ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'published'"
            )
        )
    else:
        sync_conn.execute(
            text(
                "ALTER TABLE community_notes ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'published'"
            )
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: tabloları oluştur
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_community_notes_moderation_column)
    
    # DIAGNOSTIC: Logging (Using standard logger to ensure it shows in Docker)
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info("="*50)
    logger.info("🚀 KLINIKIQ BACKEND STARTING")
    logger.info(f"📡 ALLOWED CORS ORIGINS: {settings.BACKEND_CORS_ORIGINS}")
    logger.info("📡 CORS allow_origin_regex: ^https?://tauri\\.localhost(:\\d+)?$")
    logger.info("="*50)
    
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="KlinikIQ API",
    description="TUS Hazırlık Platformu — AI destekli hasta simülasyonu",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: Tauri 2 (WKWebView) bazen "https://tauri.localhost" dışında portlu köken gönderebilir;
# allow_origin_regex, taşıdaki tüm tauri.localhost varyantlarını kapsar.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://tauri\.localhost(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotalar
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
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(drugs.router, prefix="/api/drugs", tags=["Drugs"])
app.include_router(antibiotics.router, prefix="/api/antibiotics", tags=["Antibiotics"])
app.include_router(emergency_mcq.router, prefix="/api/emergency-mcq", tags=["Emergency MCQ"])
app.include_router(practice_mcq_router, prefix="/api/practice-mcq", tags=["practice-mcq"])
app.include_router(learning.router, prefix="/api/learning", tags=["Learning"])

# Statik dosyalar (tiles ve önizlemeler)
if not os.path.exists(settings.TILES_DIR):
    os.makedirs(settings.TILES_DIR, exist_ok=True)

app.mount("/tiles", StaticFiles(directory=settings.TILES_DIR), name="tiles")

_community_root = community_uploads_abs()
_community_root.mkdir(parents=True, exist_ok=True)
app.mount(
    "/uploads/community-notes",
    StaticFiles(directory=str(_community_root)),
    name="community_uploads",
)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "KlinikIQ Backend"}
