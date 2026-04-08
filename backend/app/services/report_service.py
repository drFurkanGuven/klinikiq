from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.models.models import SimulationSession, DiagnosisSubmitted, Report, SessionStatus, Case
from app.services.ai_service import generate_report, load_history


async def create_report_for_session(session_id: str, db: AsyncSession) -> Report:
    """Bir session için rapor üretir ve DB'ye kaydeder."""

    # Session'ı al
    result = await db.execute(
        select(SimulationSession).where(SimulationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError(f"Session bulunamadı: {session_id}")

    # Zaten rapor var mı?
    existing = await db.execute(select(Report).where(Report.session_id == session_id))
    if existing.scalar_one_or_none():
        raise ValueError("Bu session için rapor zaten oluşturulmuş")

    # Vakanın bilgilerini al — async'te lazy-load yasak, explicit query kullan
    case_result = await db.execute(select(Case).where(Case.id == session.case_id))
    case = case_result.scalar_one()

    # Kullanıcının tanılarını al
    diag_result = await db.execute(
        select(DiagnosisSubmitted)
        .where(DiagnosisSubmitted.session_id == session_id)
        .order_by(DiagnosisSubmitted.rank)
    )
    diagnoses = [d.diagnosis_text for d in diag_result.scalars().all()]

    # Redis'ten konuşma geçmişini al
    conversation = await load_history(session_id)

    # GPT-4o ile rapor üret
    report_data = await generate_report(
        conversation=conversation,
        user_diagnoses=diagnoses,
        scoring_rubric=case.scoring_rubric,
        hidden_diagnosis=case.hidden_diagnosis,
    )

    # Raporu DB'ye kaydet
    report = Report(
        session_id=session_id,
        score=report_data.get("score", 0),
        correct_diagnoses=report_data.get("correct_diagnoses", []),
        missed_diagnoses=report_data.get("missed_diagnoses", []),
        pathophysiology_note=report_data.get("pathophysiology_note"),
        tus_reference=report_data.get("tus_reference"),
        recommendations=report_data.get("recommendations", []),
    )
    db.add(report)

    # Session'ı tamamlandı olarak işaretle
    session.status = SessionStatus.completed
    session.ended_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(report)
    return report
