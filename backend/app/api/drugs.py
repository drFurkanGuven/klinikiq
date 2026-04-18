"""DrugBank tabanlı ilaç arama ve detay API."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Drug
from app.schemas.drugs import (
    AtcTreeResponse,
    ByAtcResponse,
    DrugCompareResponse,
    DrugDetail,
    DrugSearchResponse,
    DrugSummary,
)

router = APIRouter()


def _drug_to_detail(d: Drug) -> DrugDetail:
    return DrugDetail(
        drugbank_id=d.drugbank_id,
        name=d.name,
        drug_type=d.drug_type,
        groups=d.groups,
        description=d.description,
        indication=d.indication,
        mechanism=d.mechanism,
        pharmacodynamics=d.pharmacodynamics,
        toxicity=d.toxicity,
        metabolism=d.metabolism,
        absorption=d.absorption,
        half_life=d.half_life,
        protein_binding=d.protein_binding,
        route_of_elimination=d.route_of_elimination,
        volume_of_distribution=d.volume_of_distribution,
        drug_interactions=d.drug_interactions,
        food_interactions=d.food_interactions,
        targets=d.targets,
        atc_codes=d.atc_codes,
        average_mass=d.average_mass,
    )


def _summary_from_drug(d: Drug) -> DrugSummary:
    ind = d.indication
    if ind and len(ind) > 200:
        ind = ind[:200]
    return DrugSummary(
        drugbank_id=d.drugbank_id,
        name=d.name,
        drug_type=d.drug_type,
        groups=d.groups,
        atc_codes=d.atc_codes,
        indication=ind,
    )


def _split_atc_chunks(text: str | None) -> list[str]:
    if not text or not text.strip():
        return []
    parts = re.split(r"[\n\r;|]+", text)
    return [p.strip() for p in parts if p.strip()]


@router.get("/search", response_model=DrugSearchResponse)
async def search_drugs(
    q: Annotated[str, Query(min_length=2)],
    atc_class: str | None = None,
    groups: str = "approved",
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    term = f"%{q}%"
    filters = [
        or_(
            Drug.name.ilike(term),
            Drug.indication.ilike(term),
            Drug.mechanism.ilike(term),
        ),
    ]
    if groups:
        filters.append(Drug.groups.ilike(f"%{groups}%"))
    if atc_class:
        filters.append(Drug.atc_codes.ilike(f"%{atc_class}%"))

    cond = and_(*filters)

    count_stmt = select(func.count()).select_from(Drug).where(cond)
    total = int((await db.execute(count_stmt)).scalar_one() or 0)

    offset = (page - 1) * limit
    page_stmt = select(Drug).where(cond).order_by(Drug.name.asc()).offset(offset).limit(limit)
    result = await db.execute(page_stmt)
    rows = result.scalars().all()

    return DrugSearchResponse(
        total=total,
        page=page,
        results=[_summary_from_drug(d) for d in rows],
    )


@router.get("/compare", response_model=DrugCompareResponse)
async def compare_drugs(
    ids: Annotated[str, Query(description="Virgülle ayrılmış 2–5 DrugBank ID")],
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    raw = [x.strip() for x in ids.split(",") if x.strip()]
    if len(raw) < 2 or len(raw) > 5:
        raise HTTPException(status_code=400, detail="2 ile 5 arasında DrugBank ID gerekli.")

    result = await db.execute(select(Drug).where(Drug.drugbank_id.in_(raw)))
    drugs = result.scalars().all()
    order_map = {rid: i for i, rid in enumerate(raw)}
    drugs.sort(key=lambda d: order_map.get(d.drugbank_id, 999))

    return DrugCompareResponse(drugs=[_drug_to_detail(d) for d in drugs])


@router.get("/atc-tree", response_model=AtcTreeResponse)
async def atc_tree(
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Drug.atc_codes).where(Drug.atc_codes.isnot(None)))
    seen: set[str] = set()
    for row in result.all():
        text = row[0]
        for chunk in _split_atc_chunks(text):
            seen.add(chunk)
    return AtcTreeResponse(categories=sorted(seen))


@router.get("/by-atc", response_model=ByAtcResponse)
async def drugs_by_atc(
    category: Annotated[str, Query(min_length=1)],
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    stmt = (
        select(Drug)
        .where(Drug.atc_codes.ilike(f"%{category}%"))
        .order_by(Drug.name.asc())
        .limit(100)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return ByAtcResponse(results=[_summary_from_drug(d) for d in rows])


@router.get("/{drugbank_id}", response_model=DrugDetail)
async def get_drug(
    drugbank_id: str,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    d = await db.get(Drug, drugbank_id)
    if not d:
        raise HTTPException(status_code=404, detail="İlaç bulunamadı.")
    return _drug_to_detail(d)
