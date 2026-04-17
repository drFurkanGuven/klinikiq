import json
from datetime import datetime, timezone
from typing import AsyncGenerator, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import (
    SimulationSession, Case, Message, DiagnosisSubmitted, SessionStatus, MessageRole
)
from app.schemas.schemas import SessionCreate, SessionOut, MessageCreate, DiagnoseSubmit, MessageOut
from app.services.ai_service import stream_patient_response
from app.services.report_service import create_report_for_session
from app.services.session_maintenance import abandon_stale_active_sessions

router = APIRouter()


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Uzun süre bekleyen aktif oturumları terk edilmişe çevir.
    await abandon_stale_active_sessions(db, user_id=user_id)

    # Vaka var mı?
    case_result = await db.execute(select(Case).where(Case.id == data.case_id, Case.is_active == True))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Vaka bulunamadı")

    # Limit Kontrolü
    from sqlalchemy import func
    from app.models.models import User
    
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()
    
    if not user.is_admin:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        count_result = await db.execute(
            select(func.count(SimulationSession.id))
            .where(SimulationSession.user_id == user_id)
            .where(SimulationSession.started_at >= today)
        )
        today_sessions_count = count_result.scalar() or 0
        
        if today_sessions_count >= user.daily_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Günlük vaka limitinize ({user.daily_limit}) ulaştınız."
            )

    session = SimulationSession(user_id=user_id, case_id=data.case_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionOut(
        id=session.id,
        case_id=session.case_id,
        status=session.status,
        started_at=session.started_at,
        messages=[],
    )


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Session detayı — case bilgisi (hasta adı, yaş, şikayet vb.) ve mesaj geçmişi dahil döner."""
    from sqlalchemy.orm import selectinload
    sess_result = await db.execute(
        select(SimulationSession)
        .options(selectinload(SimulationSession.messages))
        .where(
            SimulationSession.id == session_id,
            SimulationSession.user_id == user_id,
        )
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")

    case_result = await db.execute(select(Case).where(Case.id == session.case_id))
    case = case_result.scalar_one()

    # patient_json'dan gizli alanları çıkar
    patient_data = dict(case.patient_json)
    patient_data.pop("hidden_diagnosis", None)
    patient_data.pop("hidden_findings", None)

    return {
        "session_id": session.id,
        "status": session.status,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "case": {
            "id": case.id,
            "title": case.title,
            "specialty": case.specialty,
            "difficulty": case.difficulty,
            "patient": patient_data,
            "educational_notes": case.educational_notes,
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role.value,
                "content": m.content,
                "created_at": m.created_at,
            } for m in session.messages
        ]
    }


@router.post("/{session_id}/message")
async def send_message(
    session_id: str,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """SSE streaming ile hasta yanıtı döner."""
    sess_result = await db.execute(
        select(SimulationSession).where(
            SimulationSession.id == session_id,
            SimulationSession.user_id == user_id,
        )
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Bu oturum aktif değil")

    case_result = await db.execute(select(Case).where(Case.id == session.case_id))
    case = case_result.scalar_one()

    # Kullanıcı mesajını DB'ye kaydet
    user_msg = Message(
        session_id=session_id,
        role=MessageRole.user,
        content=data.content,
    )
    db.add(user_msg)
    await db.commit()

    async def event_generator() -> AsyncGenerator[str, None]:
        full_response = ""
        async for chunk in stream_patient_response(
            session_id=session_id,
            user_message=data.content,
            patient_json=case.patient_json,
            hidden_diagnosis=case.hidden_diagnosis,
            case_id=session.case_id,
        ):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # Asistan mesajını DB'ye kaydet (yeni session açarak)
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as new_db:
            ai_msg = Message(
                session_id=session_id,
                role=MessageRole.assistant,
                content=full_response,
            )
            new_db.add(ai_msg)
            await new_db.commit()

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{session_id}/diagnose", status_code=status.HTTP_201_CREATED)
async def submit_diagnoses(
    session_id: str,
    data: DiagnoseSubmit,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    sess_result = await db.execute(
        select(SimulationSession).where(
            SimulationSession.id == session_id,
            SimulationSession.user_id == user_id,
        )
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Bu oturum aktif değil")

    # Önceki tanıları temizle
    existing = await db.execute(
        select(DiagnosisSubmitted).where(DiagnosisSubmitted.session_id == session_id)
    )
    for d in existing.scalars().all():
        await db.delete(d)

    for i, diag_text in enumerate(data.diagnoses):
        diag = DiagnosisSubmitted(
            session_id=session_id,
            diagnosis_text=diag_text,
            rank=i + 1,
        )
        db.add(diag)

    await db.commit()
    return {"message": f"{len(data.diagnoses)} tanı kaydedildi"}


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    sess_result = await db.execute(
        select(SimulationSession).where(
            SimulationSession.id == session_id,
            SimulationSession.user_id == user_id,
        )
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Bu oturum zaten tamamlanmış")

    # Tanı var mı kontrol et
    diag_result = await db.execute(
        select(DiagnosisSubmitted).where(DiagnosisSubmitted.session_id == session_id)
    )
    if not diag_result.scalars().first():
        raise HTTPException(status_code=400, detail="Önce tanı girmelisiniz")

    try:
        report = await create_report_for_session(session_id, db)
        return {"message": "Vaka tamamlandı", "report_id": report.id, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
