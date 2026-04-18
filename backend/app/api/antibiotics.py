"""CARD / antibiyotik spektrumu API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import AntibioticSpectrum
from app.schemas.drugs import (
    AntibioticHitItem,
    AntibioticOrganismRow,
    ByDrugAntibioticResponse,
    ByOrganismResponse,
    DrugClassesResponse,
    OrganismsListResponse,
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
            organism=r.organism,
            resistance_mechanism=r.resistance_mechanism,
            aro_accession=r.aro_accession,
            amr_gene_family=r.amr_gene_family,
            drug_class=r.drug_class,
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
