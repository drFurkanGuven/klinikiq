from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import User, SimulationSession, Report, Case, SessionStatus
from app.schemas.schemas import LeaderboardItem, StudyNoteItem, UpdateProfile, UserOut

router = APIRouter()


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UpdateProfile,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if data.name is not None:
        user.name = data.name
    if data.school is not None:
        user.school = data.school
    if data.year is not None:
        user.year = data.year

    await db.commit()
    await db.refresh(user)
    return user


def mask_name(name: str) -> str:
    """İsmi maskeler: Furkan Güven -> Furkan G."""
    parts = name.strip().split()
    if not parts:
        return "Gizli Kullanıcı"
    if len(parts) == 1:
        return parts[0]
    
    first_names = " ".join(parts[:-1])
    last_name_initial = parts[-1][0].upper() + "."
    return f"{first_names} {last_name_initial}"


@router.get("/leaderboard", response_model=List[LeaderboardItem])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    # Aynı vakayı defalarca çözüp (farming) puan kasmayı engellemek için
    # her kullanıcının her vaka için aldığı EN YÜKSEK (MAX) puanı buluruz.
    from sqlalchemy import cast, String
    subq = (
        select(
            SimulationSession.user_id,
            SimulationSession.case_id,
            func.max(Report.score).label("max_score")
        )
        .join(Report, Report.session_id == SimulationSession.id)
        .where(cast(SimulationSession.status, String) == "completed")
        .group_by(SimulationSession.user_id, SimulationSession.case_id)
        .subquery()
    )

    # Bulduğumuz bu eşsiz vaka rekorlarını toplayarak skor tablosu oluştururuz
    stmt = (
        select(
            User.id,
            User.name,
            User.school,
            User.year,
            func.count(subq.c.case_id).label("total_cases"),
            func.avg(subq.c.max_score).label("avg_score"),
            func.sum(subq.c.max_score).label("total_score")
        )
        .join(subq, subq.c.user_id == User.id)
        .group_by(User.id)
        .order_by(desc("total_score"))
        .limit(50)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    leaderboard = []
    for row in rows:
        leaderboard.append(LeaderboardItem(
            name=mask_name(row.name),
            school=row.school,
            year=row.year,
            total_cases=row.total_cases,
            average_score=float(row.avg_score) if row.avg_score else 0.0,
            total_score=float(row.total_score) if row.total_score else 0.0,
        ))
        
    return leaderboard


@router.get("/study-notes", response_model=List[StudyNoteItem])
async def get_study_notes(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from sqlalchemy import cast, String
    stmt = (
        select(SimulationSession, Case, Report)
        .join(Case, SimulationSession.case_id == Case.id)
        .join(Report, Report.session_id == SimulationSession.id)
        .where(SimulationSession.user_id == user_id)
        .where(cast(SimulationSession.status, String) == "completed")
        .order_by(Report.created_at.desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    notes = []
    for session, case, report in rows:
        # Veri tipi kontrolü (JSONB bazen string dönebilir)
        missed = report.missed_diagnoses
        if not isinstance(missed, list):
            missed = []
            
        notes.append(StudyNoteItem(
            session_id=session.id,
            case_title=case.title or "İsimsiz Vaka",
            specialty=case.specialty or "Genel",
            missed_diagnoses=missed,
            pathophysiology_note=report.pathophysiology_note,
            tus_reference=report.tus_reference,
            created_at=report.created_at,
        ))
    
    return notes
