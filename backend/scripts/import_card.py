#!/usr/bin/env python3
"""
CARD aro_index.tsv (+ opsiyonel aro.tsv ontoloji) → PostgreSQL `antibiotic_spectrum`.

Kullanım:
  cd backend
  python scripts/import_card.py \\
    --aro_index /path/to/aro_index.tsv \\
    --aro_ontology /path/to/aro.tsv

DATABASE_URL: app.core.config (postgresql+asyncpg://...)
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.models import AntibioticSpectrum, Drug


def _norm_header(h: str) -> str:
    return h.strip().lower().replace(" ", "-").replace("_", "-")


def _row_dict(raw: dict[str, str | None]) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for k, v in raw.items():
        if k is None:
            continue
        nk = _norm_header(k)
        if v is None or (isinstance(v, str) and v.strip() == ""):
            out[nk] = None
        else:
            out[nk] = str(v).strip()
    return out


def load_ontology(path: Path) -> dict[str, str | None]:
    """Accession → Description."""
    out: dict[str, str | None] = {}
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for raw in reader:
            rd = _row_dict(raw)
            acc = rd.get("accession")
            if not acc:
                continue
            desc = rd.get("description")
            out[acc] = desc if desc else None
    return out


def organism_from_card_short(short: str | None) -> str | None:
    if not short or "_" not in short:
        return None
    return short.split("_", 1)[0].strip() or None


def normalize_drug_class(dc: str) -> str:
    return " ".join(dc.lower().split())


async def resolve_drugbank_id(session: AsyncSession, drug_class_norm: str) -> str | None:
    if not drug_class_norm:
        return None
    like = f"%{drug_class_norm}%"
    r = await session.execute(select(Drug.drugbank_id).where(Drug.name.ilike(like)).limit(1))
    row = r.first()
    return row[0] if row else None


async def run_import(aro_index: Path, aro_ontology: Path | None) -> None:
    ontology: dict[str, str | None] = {}
    if aro_ontology and aro_ontology.is_file():
        ontology = load_ontology(aro_ontology)
        print(f"Ontoloji yüklendi: {len(ontology)} ARO kaydı.")

    inserted = 0
    unique_classes: set[str] = set()
    rows_out: list[dict] = []

    with aro_index.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for raw in reader:
            rd = _row_dict(raw)
            aro_name = rd.get("aro-name")
            if not aro_name:
                continue

            aro_accession = rd.get("aro-accession")
            amr = rd.get("amr-gene-family")
            drug_class_raw = rd.get("drug-class") or ""
            resistance = rd.get("resistance-mechanism")
            card_short = rd.get("card-short-name")

            organism = organism_from_card_short(card_short)
            desc = ontology.get(aro_accession) if aro_accession else None

            parts = [p.strip() for p in drug_class_raw.split(";") if p.strip()]
            if not parts:
                continue

            for dc_raw in parts:
                dc_norm = normalize_drug_class(dc_raw)
                unique_classes.add(dc_norm)
                rows_out.append(
                    {
                        "antibiotic_name": aro_name,
                        "organism": organism,
                        "resistance_mechanism": resistance,
                        "aro_accession": aro_accession,
                        "amr_gene_family": amr,
                        "drug_class": dc_norm,
                        "description": desc,
                    }
                )

    async with AsyncSessionLocal() as session:
        assert isinstance(session, AsyncSession)
        await session.execute(delete(AntibioticSpectrum))
        await session.flush()

        for row in rows_out:
            dbid = await resolve_drugbank_id(session, row["drug_class"])
            session.add(
                AntibioticSpectrum(
                    drugbank_id=dbid,
                    antibiotic_name=row["antibiotic_name"],
                    organism=row["organism"],
                    resistance_mechanism=row["resistance_mechanism"],
                    aro_accession=row["aro_accession"],
                    amr_gene_family=row["amr_gene_family"],
                    drug_class=row["drug_class"],
                    description=row["description"],
                )
            )
            inserted += 1

        await session.commit()

    print(f"inserted: {inserted} kayıt, drug class: {len(unique_classes)} benzersiz")


def main() -> None:
    ap = argparse.ArgumentParser(description="CARD → antibiotic_spectrum import")
    ap.add_argument("--aro_index", required=True, type=Path, help="card-data/aro_index.tsv")
    ap.add_argument("--aro_ontology", type=Path, default=None, help="card-ontology/aro.tsv (opsiyonel)")
    args = ap.parse_args()

    if not args.aro_index.is_file():
        print(f"Dosya bulunamadı: {args.aro_index}", file=sys.stderr)
        sys.exit(1)
    if args.aro_ontology and not args.aro_ontology.is_file():
        print(f"Dosya bulunamadı: {args.aro_ontology}", file=sys.stderr)
        sys.exit(1)

    asyncio.run(run_import(args.aro_index, args.aro_ontology))


if __name__ == "__main__":
    main()
