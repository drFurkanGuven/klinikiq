"""
TUS taksonomisi — `app/data/tus_taxonomy.json` ile doğrulama.
Frontend `frontend/lib/tus-taxonomy.ts` ile senkron tutulur; güncelleme için
`backend/scripts/export_tus_taxonomy_json.py` çalıştırın.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "tus_taxonomy.json"


@lru_cache
def load_taxonomy() -> dict[str, Any]:
    if not _DATA_PATH.exists():
        raise RuntimeError(f"Taksonomi dosyası bulunamadı: {_DATA_PATH}")
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_taxonomy_payload() -> dict[str, Any]:
    """GET /taksonomi için ham veri."""
    return load_taxonomy()


def validate_classification(group: str, branch_id: str, topic_id: str) -> None:
    """
    Geçersiz dal/konu için 400 döner; böylece DB'ye tutarsız etiket yazılmaz.
    """
    data = load_taxonomy()
    groups = data.get("groups")
    if not isinstance(groups, dict):
        raise HTTPException(status_code=500, detail="Taksonomi dosyası bozuk.")

    g = groups.get(group)
    if not isinstance(g, dict):
        raise HTTPException(status_code=400, detail=f"Geçersiz grup: {group}")

    topic_list = g.get(branch_id)
    if not isinstance(topic_list, list):
        raise HTTPException(status_code=400, detail=f"Geçersiz dal: {branch_id}")

    if topic_id not in topic_list:
        raise HTTPException(
            status_code=400,
            detail=f"Bu dal için geçersiz konu: {topic_id}",
        )
