from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.models.models import SimulationSession, DiagnosisSubmitted, Report, SessionStatus, Case, Flashcard, CaseQuestion
from app.services.ai_service import generate_report, generate_flashcard, generate_mcq, load_history


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

    # ── TUS MCQ üretimi (bu vaka için ilk kez mi tamamlanıyor?) ──────────────
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as bg_db:
        existing_q = await bg_db.execute(
            select(CaseQuestion).where(CaseQuestion.case_id == session.case_id).limit(1)
        )
        if not existing_q.scalar_one_or_none():
            try:
                questions = await generate_mcq(
                    case={
                        "specialty": case.specialty,
                        "patient_json": case.patient_json,
                        "hidden_diagnosis": case.hidden_diagnosis,
                    },
                    report={
                        "pathophysiology_note": report.pathophysiology_note,
                        "tus_reference": report.tus_reference,
                    },
                )
                for q in questions:
                    bg_db.add(CaseQuestion(
                        case_id=session.case_id,
                        specialty=case.specialty,
                        question_text=q.get("question_text", ""),
                        option_a=q.get("option_a", ""),
                        option_b=q.get("option_b", ""),
                        option_c=q.get("option_c", ""),
                        option_d=q.get("option_d", ""),
                        option_e=q.get("option_e", ""),
                        correct_option=q.get("correct_option", "A"),
                        explanation=q.get("explanation", ""),
                        source_report_id=report.id,
                    ))
                await bg_db.commit()
            except Exception:
                pass  # MCQ üretimi başarısız → rapor yine de döner

    return report
