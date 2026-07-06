"""CARD / antibiyotik spektrumu API."""

from __future__ import annotations

from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import AntibioticSpectrum
from app.schemas.drugs import (
    AntibioticHitItem,
    AntibioticOrganismItem,
    AntibioticOrganismRow,
    ByDrugAntibioticResponse,
    ByDrugClassResponse,
    ByOrganismResponse,
    DrugClassesResponse,
    OrganismsListResponse,
    ResistanceMechanismGroupOut,
)

router = APIRouter()


@router.get("/by-drug/{drugbank_id}", response_model=ByDrugAntibioticResponse)
async def antibiotics_by_drug(
    drugbank_id: str,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(AntibioticSpectrum).where(AntibioticSpectrum.drugbank_id == drugbank_id)
    )
    rows = result.scalars().all()
    if not rows:
        return ByDrugAntibioticResponse(antibiotic_name="", organisms=[])

    antibiotic_name = rows[0].antibiotic_name
    organisms = [
        AntibioticOrganismRow(
            antibiotic_name=r.antibiotic_name,
            organism=r.organism,
            resistance_mechanism=r.resistance_mechanism,
            aro_accession=r.aro_accession,
            amr_gene_family=r.amr_gene_family,
            drug_class=r.drug_class,
            description=r.description,
        )
        for r in rows
    ]
    return ByDrugAntibioticResponse(antibiotic_name=antibiotic_name, organisms=organisms)


@router.get("/by-organism", response_model=ByOrganismResponse)
async def antibiotics_by_organism(
    organism: Annotated[str, Query(min_length=3)],
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    term = f"%{organism}%"
    result = await db.execute(
        select(AntibioticSpectrum).where(AntibioticSpectrum.organism.ilike(term))
    )
    rows = result.scalars().all()
    antibiotics = [
        AntibioticHitItem(
            antibiotic_name=r.antibiotic_name,
            drugbank_id=r.drugbank_id,
            resistance_mechanism=r.resistance_mechanism,
            drug_class=r.drug_class,
        )
        for r in rows
    ]
    return ByOrganismResponse(organism=organism, antibiotics=antibiotics)


@router.get("/by-drug-class", response_model=ByDrugClassResponse)
async def antibiotics_by_drug_class(
    drug_class: Annotated[str, Query(min_length=2)],
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    term = f"%{drug_class.strip()}%"
    result = await db.execute(
        select(AntibioticSpectrum).where(AntibioticSpectrum.drug_class.ilike(term))
    )
    rows = result.scalars().all()
    total = len(rows)

    groups: dict[str, list] = defaultdict(list)
    for r in rows:
        key = (r.resistance_mechanism or "").strip()
        groups[key].append(r)

    sorted_keys = sorted(groups.keys(), key=lambda k: len(groups[k]), reverse=True)

    out_groups: list[ResistanceMechanismGroupOut] = []
    for key in sorted_keys:
        items = groups[key]
        items_sorted = sorted(items, key=lambda x: x.id or 0)
        count = len(items)
        fams = sorted(
            {
                (r.amr_gene_family or "").strip()
                for r in items
                if r.amr_gene_family and str(r.amr_gene_family).strip()
            }
        )
        slice20 = items_sorted[:20]
        entries = [
            AntibioticOrganismItem(
                antibiotic_name=r.antibiotic_name,
                organism=r.organism,
                resistance_mechanism=r.resistance_mechanism,
                aro_accession=r.aro_accession,
                amr_gene_family=r.amr_gene_family,
                drug_class=r.drug_class,
                description=r.description,
            )
            for r in slice20
        ]
        out_groups.append(
            ResistanceMechanismGroupOut(
                resistance_mechanism=key if key else "—",
                count=count,
                gene_families=fams,
                entries=entries,
            )
        )

    return ByDrugClassResponse(drug_class=drug_class.strip(), total=total, resistance_mechanisms=out_groups)


@router.get("/organisms", response_model=OrganismsListResponse)
async def list_organisms(
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
    q: str | None = Query(None, min_length=1, description="İsteğe bağlı filtre öneki"),
    limit: int = Query(200, ge=1, le=500),
):
    stmt = select(distinct(AntibioticSpectrum.organism)).where(
        AntibioticSpectrum.organism.isnot(None),
        AntibioticSpectrum.organism != "",
    )
    if q:
        stmt = stmt.where(AntibioticSpectrum.organism.ilike(f"%{q}%"))
    stmt = stmt.order_by(AntibioticSpectrum.organism.asc()).limit(limit)
    result = await db.execute(stmt)
    organisms = [r[0] for r in result.all() if r[0]]
    return OrganismsListResponse(organisms=organisms)


@router.get("/drug-classes", response_model=DrugClassesResponse)
async def list_drug_classes(
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(distinct(AntibioticSpectrum.drug_class)).where(
            AntibioticSpectrum.drug_class.isnot(None),
            AntibioticSpectrum.drug_class != "",
        )
    )
    classes = sorted({r[0] for r in result.all() if r[0]})
    return DrugClassesResponse(classes=classes)
