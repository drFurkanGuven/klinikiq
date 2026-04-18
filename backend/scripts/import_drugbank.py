#!/usr/bin/env python3
"""
DrugBank clean CSV → PostgreSQL `drugs` tablosu.

Kullanım (proje kökünden):
  cd backend && python scripts/import_drugbank.py /path/to/drugbank_clean.csv

DATABASE_URL: app.core.config (örn. postgresql+asyncpg://...)
"""

from __future__ import annotations

import asyncio
import csv
import sys
from pathlib import Path

# backend/ kökünü path'e ekle
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.models import Drug


def _norm_header(h: str) -> str:
    return h.strip().lower().replace(" ", "-")


def _row_dict(raw: dict[str, str | None]) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for k, v in raw.items():
        nk = _norm_header(k)
        if v is None or (isinstance(v, str) and v.strip() == ""):
            out[nk] = None
        else:
            out[nk] = str(v).strip()
    return out


def _map_to_drug(row: dict[str, str | None]) -> dict[str, str | None]:
    """DrugBank CSV kolonlarını Drug model alanlarına çevir."""

    def get(*keys: str) -> str | None:
        for k in keys:
            if k in row and row[k] is not None:
                return row[k]
        return None

    drugbank_id = get("drugbank-id", "drugbank_id", "id")
    if not drugbank_id:
        return {}

    return {
        "drugbank_id": drugbank_id,
        "name": get("name") or "",
        "drug_type": get("type", "drug-type"),
        "groups": get("groups"),
        "description": get("description"),
        "indication": get("indication"),
        "mechanism": get("mechanism-of-action", "mechanism"),
        "pharmacodynamics": get("pharmacodynamics"),
        "toxicity": get("toxicity"),
        "metabolism": get("metabolism"),
        "absorption": get("absorption"),
        "half_life": get("half-life", "half_life"),
        "protein_binding": get("protein-binding", "protein_binding"),
        "route_of_elimination": get("route-of-elimination", "route_of_elimination"),
        "volume_of_distribution": get("volume-of-distribution", "volume_of_distribution"),
        "drug_interactions": get("drug-interactions", "drug_interactions"),
        "food_interactions": get("food-interactions", "food_interactions"),
        "targets": get("targets"),
        "atc_codes": get("atc-codes", "atc_codes"),
        "average_mass": get("average-mass", "average_mass", "molecular-weight"),
    }


async def _run(csv_path: Path) -> None:
    inserted = 0
    updated = 0
    skipped = 0
    approved_skip = 0

    with csv_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    async with AsyncSessionLocal() as session:
        assert isinstance(session, AsyncSession)

        for raw in rows:
            rd = _row_dict(raw)
            groups = (rd.get("groups") or "").lower()
            if "approved" not in groups:
                approved_skip += 1
                continue

            data = _map_to_drug(rd)
            if not data.get("drugbank_id"):
                skipped += 1
                continue

            pk = data["drugbank_id"]
            existing = await session.get(Drug, pk)
            if not data.get("name"):
                skipped += 1
                continue

            if existing:
                for k, v in data.items():
                    if k == "drugbank_id":
                        continue
                    setattr(existing, k, v)
                updated += 1
            else:
                session.add(Drug(**data))  # type: ignore[arg-type]
                inserted += 1

        await session.commit()

    print(f"DrugBank import tamamlandı: {inserted} inserted, {updated} updated, {skipped} skipped (no id), {approved_skip} skipped (not approved).")


def main() -> None:
    if len(sys.argv) < 2:
        print("Kullanım: python scripts/import_drugbank.py <path_to_drugbank_clean.csv>", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        print(f"Dosya bulunamadı: {path}", file=sys.stderr)
        sys.exit(1)
    asyncio.run(_run(path))


if __name__ == "__main__":
    main()
