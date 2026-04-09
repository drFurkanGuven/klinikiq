from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Report, SimulationSession, Case, User, Message
from app.schemas.schemas import ReportOut, HistoryItem, ClinicalReasoningOut
from app.services.ai_service import analyze_clinical_reasoning

router = APIRouter()


@router.get("/sessions/{session_id}/report", response_model=ReportOut)
async def get_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Raporun sahibi mi?
    sess_result = await db.execute(
        select(SimulationSession).where(
            SimulationSession.id == session_id,
            SimulationSession.user_id == user_id,
        )
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")

    report_result = await db.execute(
        select(Report).where(Report.session_id == session_id)
    )
    report = report_result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapor henüz oluşturulmamış")

    # Klinik akıl yürütme analizi (AI yok — mesajlardan hesaplanır)
    msgs_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = msgs_result.scalars().all()
    reasoning_data = analyze_clinical_reasoning(messages)
    clinical_reasoning = ClinicalReasoningOut(**reasoning_data)

    return ReportOut(
        id=report.id,
        session_id=report.session_id,
        score=report.score,
        correct_diagnoses=report.correct_diagnoses or [],
        missed_diagnoses=report.missed_diagnoses or [],
        pathophysiology_note=report.pathophysiology_note,
        tus_reference=report.tus_reference,
        recommendations=report.recommendations or [],
        created_at=report.created_at,
        clinical_reasoning=clinical_reasoning,
    )


@router.get("/users/me/history", response_model=List[HistoryItem])
async def get_history(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(SimulationSession, Case, Report)
        .join(Case, SimulationSession.case_id == Case.id)
        .outerjoin(Report, Report.session_id == SimulationSession.id)
        .where(SimulationSession.user_id == user_id)
        .order_by(SimulationSession.started_at.desc())
    )

    items = []
    for session, case, report in result.all():
        items.append(HistoryItem(
            session_id=session.id,
            case_title=case.title,
            specialty=case.specialty,
            difficulty=case.difficulty,
            status=session.status.value,
            started_at=session.started_at,
            ended_at=session.ended_at,
            score=report.score if report else None,
        ))
    return items
