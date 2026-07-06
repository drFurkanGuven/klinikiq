from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String
from typing import Optional, List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Case
from app.schemas.schemas import CaseListItem, CaseDetail

router = APIRouter()


@router.get("", response_model=List[CaseListItem])
async def list_cases(
    specialty: Optional[str] = Query(None, description="Uzmanlık alanı filtresi"),
    difficulty: Optional[str] = Query(None, description="Zorluk filtresi: easy/medium/hard"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    query = select(Case).where(Case.is_active == True)
    if specialty:
        query = query.where(cast(Case.specialty, String) == specialty)
    if difficulty:
        query = query.where(cast(Case.difficulty, String) == difficulty)

    result = await db.execute(query)
    cases = result.scalars().all()

    items = []
    for c in cases:
        pj = c.patient_json or {}
        items.append(CaseListItem(
            id=c.id,
            title=c.title,
            specialty=c.specialty,
            difficulty=c.difficulty,
            chief_complaint=pj.get("chief_complaint"),
            patient_age=pj.get("age"),
            patient_gender=pj.get("gender"),
            is_active=c.is_active,
        ))
    return items


@router.get("/random", response_model=CaseListItem)
async def get_random_case(
    specialties: Optional[str] = Query(None, description="Virgülle ayrılmış branş listesi (örn: cardiology,neurology)"),
    difficulty: Optional[str] = Query(None, description="Zorluk filtresi"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from sqlalchemy import func
    from app.models.models import SimulationSession

    # Daha önce çözülmüş vakaların ID listesini subquery olarak al (Eşsizlik kuralı)
    past_cases_subq = select(SimulationSession.case_id).where(SimulationSession.user_id == user_id)

    query = select(Case).where(Case.is_active == True)
    query = query.where(Case.id.notin_(past_cases_subq))

    if specialties:
        spec_list = [s.strip() for s in specialties.split(",") if s.strip()]
        if spec_list:
            query = query.where(Case.specialty.in_(spec_list))
            
    if difficulty:
        query = query.where(cast(Case.difficulty, String) == difficulty)

    query = query.order_by(func.random()).limit(1)

    result = await db.execute(query)
    c = result.scalar_one_or_none()

    if not c:
        raise HTTPException(
            status_code=404, 
            detail="Seçtiğiniz kriterlere uygun veya daha önce çözmediğiniz yeni bir vaka bulunamadı."
        )

    pj = c.patient_json or {}
    return CaseListItem(
        id=c.id,
        title=c.title,
        specialty=c.specialty,
        difficulty=c.difficulty,
        chief_complaint=pj.get("chief_complaint"),
        patient_age=pj.get("age"),
        patient_gender=pj.get("gender"),
        is_active=c.is_active,
    )


@router.get("/recommended", response_model=CaseListItem)
async def get_recommended_case(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """En zayıf branştan çözülmemiş vaka öner. Skor geçmişi yoksa rastgele döner."""
    from sqlalchemy import func
    from app.models.models import SimulationSession, Report

    completed_subq = select(SimulationSession.case_id).where(SimulationSession.user_id == user_id)

    # Branş başına ortalama skor (en düşükten yükseğe)
    specialty_scores = await db.execute(
        select(Case.specialty, func.avg(Report.score).label("avg_score"))
        .join(SimulationSession, SimulationSession.case_id == Case.id)
        .join(Report, Report.session_id == SimulationSession.id)
        .where(SimulationSession.user_id == user_id)
        .group_by(Case.specialty)
        .order_by(func.avg(Report.score).asc())
    )
    scores = specialty_scores.all()

    from sqlalchemy import cast, String
    # En zayıf branştan başlayarak çözülmemiş vaka ara
    for specialty, _ in scores:
        result = await db.execute(
            select(Case)
            .where(Case.is_active == True)
            .where(cast(Case.specialty, String) == specialty)
            .where(Case.id.notin_(completed_subq))
            .order_by(func.random())
            .limit(1)
        )
        c = result.scalar_one_or_none()
        if c:
            pj = c.patient_json or {}
            return CaseListItem(
                id=c.id, title=c.title, specialty=c.specialty, difficulty=c.difficulty,
                chief_complaint=pj.get("chief_complaint"), patient_age=pj.get("age"),
                patient_gender=pj.get("gender"), is_active=c.is_active,
            )

    # Geçmiş yoksa veya tüm zayıf branşlar tamamlandıysa rastgele döndür
    result = await db.execute(
        select(Case)
        .where(Case.is_active == True)
        .where(Case.id.notin_(completed_subq))
        .order_by(func.random())
        .limit(1)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Çözülmemiş vaka kalmadı.")

    pj = c.patient_json or {}
    return CaseListItem(
        id=c.id, title=c.title, specialty=c.specialty, difficulty=c.difficulty,
        chief_complaint=pj.get("chief_complaint"), patient_age=pj.get("age"),
        patient_gender=pj.get("gender"), is_active=c.is_active,
    )


@router.get("/{case_id}", response_model=CaseDetail)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(status_code=404, detail="Vaka bulunamadı")

    # patient_json'dan hidden alanları çıkar
    patient_data = dict(case.patient_json)
    patient_data.pop("hidden_diagnosis", None)
    patient_data.pop("hidden_findings", None)

    return CaseDetail(
        id=case.id,
        title=case.title,
        specialty=case.specialty,
        difficulty=case.difficulty,
        patient_json=patient_data,
        educational_notes=case.educational_notes,
    )
