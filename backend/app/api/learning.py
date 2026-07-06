"""
Tamamlanan vaka raporlarından havuz öğrenme kartları (pathophysiology_note + tus_reference).
Vaka başına en güncel rapor (row_number).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Case, Report, SimulationSession, SessionStatus
from app.schemas.schemas import LearningCardOut, LearningCardsPage

router = APIRouter()


def _latest_report_subquery(specialty: str | None):
    """Her case_id için created_at'e göre en son rapor satırı."""
    rn = func.row_number().over(partition_by=Case.id, order_by=Report.created_at.desc()).label("rn")

    inner = (
        select(
            Report.id.label("report_id"),
            Report.pathophysiology_note,
            Report.tus_reference,
            Report.score,
            Report.created_at,
            Case.id.label("case_id"),
            Case.title.label("case_title"),
            Case.specialty,
            Case.difficulty,
            rn,
        )
        .select_from(Report)
        .join(SimulationSession, Report.session_id == SimulationSession.id)
        .join(Case, SimulationSession.case_id == Case.id)
        .where(SimulationSession.status == SessionStatus.completed)
        .where(
            or_(
                and_(Report.pathophysiology_note.isnot(None), Report.pathophysiology_note != ""),
                and_(Report.tus_reference.isnot(None), Report.tus_reference != ""),
            )
        )
    )
    if specialty and specialty.strip():
        inner = inner.where(Case.specialty == specialty.strip())
    return inner.subquery()


@router.get("/cards", response_model=LearningCardsPage)
async def learning_cards(
    specialty: str | None = Query(None, max_length=80, description="Branş filtresi (cases.specialty)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    sq = _latest_report_subquery(specialty)

    base = select(sq).where(sq.c.rn == 1).subquery()
    count_stmt = select(func.count()).select_from(base)
    total = int((await db.execute(count_stmt)).scalar_one() or 0)

    page_stmt = (
        select(sq)
        .where(sq.c.rn == 1)
        .order_by(sq.c.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(page_stmt)

    items: list[LearningCardOut] = []
    for row in result.mappings():
        items.append(
            LearningCardOut(
                report_id=str(row["report_id"]),
                case_id=str(row["case_id"]),
                case_title=str(row["case_title"] or "Vaka"),
                specialty=str(row["specialty"] or "other"),
                difficulty=str(row["difficulty"] or "medium"),
                pathophysiology_note=row["pathophysiology_note"],
                tus_reference=row["tus_reference"],
                score=float(row["score"] or 0),
                created_at=row["created_at"],
            )
        )

    return LearningCardsPage(items=items, total=total, limit=limit, offset=offset)


@router.get("/specialties", response_model=list[str])
async def learning_specialties(
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    """Havuzda en az bir özet içeren branşlar (alfabetik)."""
    sq = _latest_report_subquery(None)
    stmt = (
        select(sq.c.specialty)
        .where(sq.c.rn == 1)
        .distinct()
        .order_by(sq.c.specialty)
    )
    result = await db.execute(stmt)
    return [str(r[0]) for r in result.all() if r[0]]
