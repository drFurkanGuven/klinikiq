#!/usr/bin/env python3
"""
CARD (card.mcmaster.ca) TSV → `antibiotic_spectrum` tablosu.

İndirme: https://card.mcmaster.ca/download — card.tar.bz2 içinde örn. aro_index.tsv

Kullanım:
  cd backend && python scripts/import_card.py /path/to/aro_index.tsv

İş akışı:
  1) antibiotic_spectrum tablosunu temizler
  2) TSV satırlarını okur (sekme ayrımlı)
  3) antibiotic_name → drugs.name ile eşleşen drugbank_id (önce lower eşit, sonra ILIKE)
  4) Kayıtları yazar

Gerçek CARD sütun adları sürüme göre değişebilir; aşağıdaki başlıklar için
eş anlamlılar denenir. Gerekirse _HEADER_ALIASES güncellenir.
"""

from __future__ import annotations

import asyncio
import csv
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.models import AntibioticSpectrum, Drug

# Olası sütun adları (CARD / özel dışa aktarım)
_HEADER_ALIASES = {
    "antibiotic_name": (
        "antibiotic",
        "antibiotic name",
        "compound name",
        "compound",
        "drug",
    ),
    "organism": (
        "best_positive_phenotype",
        "best positive phenotype",
        "organism",
        "species",
        "taxon",
    ),
    "resistance_mechanism": (
        "resistance mechanism",
        "resistance_mechanism",
    ),
    "aro_accession": (
        "aro accession",
        "aro_accession",
        "aro",
    ),
    "amr_gene_family": (
        "amr gene family",
        "amr_gene_family",
        "gene family",
    ),
    "drug_class": (
        "drug class",
        "drug_class",
        "class",
    ),
}


def _norm(h: str) -> str:
    return h.strip().lower().replace(" ", "_").replace("-", "_")


def _build_colmap(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        return {}
    nh = {_norm(h): h for h in fieldnames}
    out: dict[str, str] = {}
    for canon, aliases in _HEADER_ALIASES.items():
        for a in aliases:
            key = _norm(a)
            if key in nh:
                out[canon] = nh[key]
                break
    return out


async def _resolve_drugbank_id(session: AsyncSession, antibiotic_name: str) -> str | None:
    name = antibiotic_name.strip()
    if not name:
        return None
    r = await session.execute(
        select(Drug.drugbank_id).where(func.lower(Drug.name) == func.lower(name)).limit(1)
    )
    row = r.first()
    if row:
        return row[0]
    r2 = await session.execute(select(Drug.drugbank_id).where(Drug.name.ilike(name)).limit(1))
    row2 = r2.first()
    if row2:
        return row2[0]
    like = f"%{name}%"
    r3 = await session.execute(select(Drug.drugbank_id).where(Drug.name.ilike(like)).limit(1))
    row3 = r3.first()
    return row3[0] if row3 else None


async def _run(tsv_path: Path) -> None:
    if not tsv_path.is_file():
        print(f"Dosya bulunamadı: {tsv_path}", file=sys.stderr)
        sys.exit(1)

    inserted = 0

    with tsv_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        fieldnames = reader.fieldnames
        colmap = _build_colmap(list(fieldnames) if fieldnames else [])

        if "antibiotic_name" not in colmap or "organism" not in colmap:
            print(
                "TSV başlıkları tanınmadı. Beklenen: Antibiotic (veya eşdeğeri) ve organism sütunları.\n"
                f"Bulunan: {fieldnames}",
                file=sys.stderr,
            )
            sys.exit(1)

        rows_to_insert: list[dict] = []
        for raw in reader:
            def pick(key: str) -> str | None:
                col = colmap.get(key)
                if not col:
                    return None
                v = raw.get(col)
                if v is None or str(v).strip() == "":
                    return None
                return str(v).strip()

            ab = pick("antibiotic_name")
            org = pick("organism")
            if not ab or not org:
                continue
            rows_to_insert.append(
                {
                    "antibiotic_name": ab,
                    "organism": org,
                    "resistance_mechanism": pick("resistance_mechanism"),
                    "aro_accession": pick("aro_accession"),
                    "amr_gene_family": pick("amr_gene_family"),
                    "drug_class": pick("drug_class"),
                }
            )

    async with AsyncSessionLocal() as session:
        await session.execute(delete(AntibioticSpectrum))
        await session.flush()

        for r in rows_to_insert:
            dbid = await _resolve_drugbank_id(session, r["antibiotic_name"])
            session.add(
                AntibioticSpectrum(
                    drugbank_id=dbid,
                    antibiotic_name=r["antibiotic_name"],
                    organism=r["organism"],
                    resistance_mechanism=r.get("resistance_mechanism"),
                    aro_accession=r.get("aro_accession"),
                    amr_gene_family=r.get("amr_gene_family"),
                    drug_class=r.get("drug_class"),
                )
            )
            inserted += 1

        await session.commit()

    print(f"CARD import tamamlandı: antibiotic_spectrum yenilendi, {inserted} satır yazıldı.")


def main() -> None:
    if len(sys.argv) < 2:
        print("Kullanım: python scripts/import_card.py <path_to.tsv>", file=sys.stderr)
        sys.exit(1)
    asyncio.run(_run(Path(sys.argv[1]).resolve()))


if __name__ == "__main__":
    main()
