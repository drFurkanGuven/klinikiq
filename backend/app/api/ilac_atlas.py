"""
Tıp Atlası ilaclardb — SQLite ile barkod araması (proje kökündeki ilac.json’dan üretilen DB).
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


def _db_path() -> Path:
    raw = (os.environ.get("ILAC_ATLAS_DB_PATH") or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    # backend çalışma dizini: /app veya backend/
    here = Path(__file__).resolve().parents[2]  # app/api -> app -> backend
    return (here / "data" / "ilac_atlas.db").resolve()


class IlacAtlasOut(BaseModel):
    id: int | None = None
    barcode: str
    atc_code: str | None = None
    active_ingredient: str | None = None
    product_name: str | None = None
    category_1: str | None = None
    category_2: str | None = None
    category_3: str | None = None
    category_4: str | None = None
    category_5: str | None = None
    description: str | None = None
    source: str = Field(default="Tip-Atlasi ilaclardb (yerel SQLite)")
    disclaimer: str = Field(
        default=(
            "Metin veri setinden gelir; güncel resmî KÜB ile birebir olmayabilir. "
            "Tıbbi karar için eczacı/hekim ve ürün bilgilendirme belgesine başvurun."
        )
    )


def _norm_barcode(barcode: str) -> str:
    s = "".join(c for c in barcode.strip() if c.isdigit())
    if not s:
        raise HTTPException(status_code=400, detail="Geçersiz barkod.")
    return s


@router.get("/atlas/barcode/{barcode}", response_model=IlacAtlasOut)
def get_ilac_atlas_by_barcode(barcode: str):
    """Barkod ile Tıp Atlası kullanma talimatı metni (ilac_atlas.db gerekir)."""
    bc = _norm_barcode(barcode)
    path = _db_path()
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail=(
                "İlaç atlas veritabanı bulunamadı. Sunucuda "
                "`python backend/scripts/build_ilac_atlas_db.py` çalıştırıp "
                "backend/data/ilac_atlas.db oluşturun veya ILAC_ATLAS_DB_PATH ayarlayın."
            ),
        )

    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT id, barcode, atc_code, active_ingredient, product_name,
                   category_1, category_2, category_3, category_4, category_5, description
            FROM ilac_atlas WHERE barcode = ?
            """,
            (bc,),
        )
        row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Bu barkod için Tıp Atlası kaydı yok.",
        )

    return IlacAtlasOut(
        id=row["id"],
        barcode=str(row["barcode"]),
        atc_code=row["atc_code"],
        active_ingredient=row["active_ingredient"],
        product_name=row["product_name"],
        category_1=row["category_1"],
        category_2=row["category_2"],
        category_3=row["category_3"],
        category_4=row["category_4"],
        category_5=row["category_5"],
        description=row["description"],
    )
