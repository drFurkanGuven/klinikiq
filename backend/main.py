from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, cases, sessions, reports, users, admin, flashcards

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: tabloları oluştur
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="KlinikIQ API",
    description="TUS Hazırlık Platformu — AI destekli hasta simülasyonu",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotalar
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "KlinikIQ Backend"}
