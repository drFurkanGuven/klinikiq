"""Farmakoloji mantık haritaları — curated statik JSON (backend/data/pharma/maps).

İçerik çalışma anında LLM ile üretilmez; git'te versiyonlanan JSON dosyalarından okunur.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.core.security import get_current_user_id
from app.schemas.schemas import PharmaMapOut, PharmaMapSummary

router = APIRouter()

# backend/app/api/pharma.py -> backend/data/pharma/maps
MAPS_DIR = Path(__file__).resolve().parents[2] / "data" / "pharma" / "maps"

_ID_RE = re.compile(r"^[a-z0-9_]+$")


def _load_map_file(map_id: str) -> dict:
    """Tek bir harita JSON dosyasını okur (path traversal'a karşı id doğrulanır)."""
    if not _ID_RE.match(map_id):
        raise HTTPException(status_code=404, detail="Harita bulunamadı")
    path = MAPS_DIR / f"{map_id}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Harita bulunamadı")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _list_maps() -> list[PharmaMapSummary]:
    if not MAPS_DIR.is_dir():
        return []
    out: list[PharmaMapSummary] = []
    for path in sorted(MAPS_DIR.glob("*.json")):
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            out.append(
                PharmaMapSummary(
                    id=data.get("id", path.stem),
                    title_tr=data.get("title_tr", path.stem),
                    description_tr=data.get("description_tr", ""),
                )
            )
        except (json.JSONDecodeError, ValidationError, OSError):
            continue
    return out


@router.get("/maps", response_model=list[PharmaMapSummary])
async def list_maps(_user_id: str = Depends(get_current_user_id)):
    """Mevcut mantık haritalarının özet listesi."""
    return _list_maps()


@router.get("/maps/{map_id}", response_model=PharmaMapOut)
async def get_map(map_id: str, _user_id: str = Depends(get_current_user_id)):
    """Tek bir haritanın tam içeriği (nodes/edges/interventions/quiz)."""
    data = _load_map_file(map_id)
    try:
        return PharmaMapOut(**data)
    except ValidationError as exc:
        raise HTTPException(status_code=500, detail="Harita verisi geçersiz") from exc
