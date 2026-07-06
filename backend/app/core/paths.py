"""Dosya sistemi kökleri (topluluk yüklemeleri vb.)."""
from pathlib import Path

from app.core.config import settings


def community_uploads_abs() -> Path:
    p = Path(settings.COMMUNITY_UPLOADS_DIR)
    if p.is_absolute():
        return p.resolve()
    backend_root = Path(__file__).resolve().parents[2]
    return (backend_root / settings.COMMUNITY_UPLOADS_DIR).resolve()
