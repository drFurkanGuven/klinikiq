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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import PharmaMapProgress
from app.schemas.schemas import (
    PharmaLearningPathOut,
    PharmaMapOut,
    PharmaMapProgressOut,
    PharmaMapProgressPatch,
    PharmaMapSummary,
)

router = APIRouter()

# backend/app/api/pharma.py -> backend/data/pharma
PHARMA_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "pharma"
MAPS_DIR = PHARMA_DATA_DIR / "maps"
LEARNING_PATH_FILE = PHARMA_DATA_DIR / "learning_path.json"

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
def _load_learning_path() -> PharmaLearningPathOut:
    if not LEARNING_PATH_FILE.is_file():
        return PharmaLearningPathOut(title_tr="Farmakoloji öğrenme yolu", items=[])
    with LEARNING_PATH_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return PharmaLearningPathOut(**data)


def _path_meta_by_map_id() -> dict[str, dict]:
    """learning_path.json içindeki meta bilgileri map_id → item dict."""
    lp = _load_learning_path()
    return {item.map_id: item.model_dump() for item in lp.items}


@lru_cache(maxsize=1)
def _list_maps() -> list[PharmaMapSummary]:
    if not MAPS_DIR.is_dir():
        return []
    path_meta = _path_meta_by_map_id()
    out: list[PharmaMapSummary] = []
    for path in sorted(MAPS_DIR.glob("*.json")):
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            map_id = data.get("id", path.stem)
            meta = path_meta.get(map_id, {})
            nodes = data.get("nodes", [])
            out.append(
                PharmaMapSummary(
                    id=map_id,
                    title_tr=data.get("title_tr", path.stem),
                    description_tr=data.get("description_tr", ""),
                    order=meta.get("order", 999),
                    level=meta.get("level", "temel"),
                    estimated_minutes=meta.get("estimated_minutes", 15),
                    prerequisites=meta.get("prerequisites", []),
                    high_yield_count=sum(1 for n in nodes if n.get("high_yield")),
                    quiz_count=len(data.get("quiz", [])),
                    vignette_count=len(data.get("vignettes", [])),
                )
            )
        except (json.JSONDecodeError, ValidationError, OSError):
            continue
    out.sort(key=lambda m: m.order)
    return out


@router.get("/learning-path", response_model=PharmaLearningPathOut)
async def get_learning_path(_user_id: str = Depends(get_current_user_id)):
    """Sıralı öğrenme yolu (ön koşullar ve tahmini süreler)."""
    return _load_learning_path()


@router.get("/maps", response_model=list[PharmaMapSummary])
async def list_maps(_user_id: str = Depends(get_current_user_id)):
    """Mevcut mantık haritalarının özet listesi (öğrenme yolu meta verisiyle)."""
    return _list_maps()


@router.get("/maps/{map_id}", response_model=PharmaMapOut)
async def get_map(map_id: str, _user_id: str = Depends(get_current_user_id)):
    """Tek bir haritanın tam içeriği (nodes/edges/interventions/quiz/vignettes)."""
    data = _load_map_file(map_id)
    try:
        return PharmaMapOut(**data)
    except ValidationError as exc:
        raise HTTPException(status_code=500, detail="Harita verisi geçersiz") from exc


def _row_to_out(row: PharmaMapProgress) -> PharmaMapProgressOut:
    return PharmaMapProgressOut(
        map_id=row.map_id,
        visited=row.visited,
        quiz_completed=row.quiz_completed,
        quiz_score_pct=row.quiz_score_pct,
        path_tree_completed=row.path_tree_completed,
        completed_at=row.completed_at,
    )


def _apply_patch(row: PharmaMapProgress, patch: PharmaMapProgressPatch) -> None:
    from datetime import datetime, timezone

    data = patch.model_dump(exclude_unset=True)
    if data.get("visited"):
        row.visited = True
    if data.get("path_tree_completed"):
        row.path_tree_completed = True
    if patch.quiz_completed is not None:
        row.quiz_completed = row.quiz_completed or patch.quiz_completed
    if patch.quiz_score_pct is not None:
        row.quiz_score_pct = patch.quiz_score_pct
        if patch.quiz_score_pct >= 70:
            row.quiz_completed = True
    if patch.completed_at is not None:
        row.completed_at = patch.completed_at
    elif patch.quiz_completed and row.completed_at is None:
        row.completed_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)


@router.get("/progress", response_model=list[PharmaMapProgressOut])
async def list_progress(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının tüm harita ilerlemeleri."""
    result = await db.execute(
        select(PharmaMapProgress).where(PharmaMapProgress.user_id == user_id)
    )
    return [_row_to_out(r) for r in result.scalars().all()]


@router.patch("/progress/{map_id}", response_model=PharmaMapProgressOut)
async def patch_progress(
    map_id: str,
    body: PharmaMapProgressPatch,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Harita ilerlemesini güncelle (upsert)."""
    if not _ID_RE.match(map_id):
        raise HTTPException(status_code=400, detail="Geçersiz harita kimliği")
    result = await db.execute(
        select(PharmaMapProgress).where(
            PharmaMapProgress.user_id == user_id,
            PharmaMapProgress.map_id == map_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        row = PharmaMapProgress(user_id=user_id, map_id=map_id)
        db.add(row)
    _apply_patch(row, body)
    await db.commit()
    await db.refresh(row)
    return _row_to_out(row)
