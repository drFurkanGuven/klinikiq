from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Flashcard, FlashcardProgress, FlashcardStatus
from app.schemas.schemas import FlashcardOut, FlashcardProgressUpdate, FlashcardStatsOut

router = APIRouter()

_STATUS_ORDER = {"new": 0, "learning": 1, "known": 2}


async def _attach_user_status(
    flashcards: list,
    user_id: str,
    db: AsyncSession,
) -> list[FlashcardOut]:
    """Flashcard listesine kullanıcının ilerleme durumunu ekler."""
    fc_ids = [f.id for f in flashcards]
    if not fc_ids:
        return []

    prog_result = await db.execute(
        select(FlashcardProgress).where(
            FlashcardProgress.user_id == user_id,
            FlashcardProgress.flashcard_id.in_(fc_ids),
        )
    )
    progress_map = {p.flashcard_id: p.status for p in prog_result.scalars().all()}

    return [
        FlashcardOut(
            id=fc.id,
            case_id=fc.case_id,
            specialty=fc.specialty,
            difficulty=fc.difficulty,
            topic=fc.topic,
            question=fc.question,
            answer=fc.answer,
            key_points=fc.key_points or [],
            tus_reference=fc.tus_reference,
            created_at=fc.created_at,
            user_status=progress_map.get(fc.id, "new"),
        )
        for fc in flashcards
    ]


@router.get("", response_model=list[FlashcardOut])
async def list_flashcards(
    specialty: str | None = None,
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Tüm flashcard havuzunu listele (isteğe bağlı branş/zorluk filtresi)."""
    query = select(Flashcard)
    if specialty:
        query = query.where(cast(Flashcard.specialty, String) == specialty)
    if difficulty:
        query = query.where(cast(Flashcard.difficulty, String) == difficulty)
    query = query.order_by(Flashcard.created_at.desc())

    result = await db.execute(query)
    flashcards = result.scalars().all()
    return await _attach_user_status(flashcards, user_id, db)


@router.get("/stats", response_model=FlashcardStatsOut)
async def get_flashcard_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Kullanıcının flashcard istatistiği."""
    total_result = await db.execute(select(func.count(Flashcard.id)))
    total = total_result.scalar() or 0

    prog_result = await db.execute(
        select(FlashcardProgress).where(FlashcardProgress.user_id == user_id)
    )
    progress_list = prog_result.scalars().all()

    counts = {"new": 0, "learning": 0, "known": 0}
    seen_ids = set()
    for p in progress_list:
        # Statü nesnesini metne çevirerek hatayı engelliyoruz
        status_key = str(p.status)
        if status_key in counts:
            counts[status_key] += 1
        seen_ids.add(p.flashcard_id)

    # Henüz hiç görülmemiş kartlar da "new" sayılır
    counts["new"] += total - len(seen_ids)

    return FlashcardStatsOut(total=total, **counts)


@router.get("/study", response_model=list[FlashcardOut])
async def get_study_queue(
    specialty: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Çalışma kuyruğu: new → learning → known sırasında döner."""
    query = select(Flashcard)
    if specialty:
        query = query.where(cast(Flashcard.specialty, String) == specialty)

    result = await db.execute(query)
    flashcards = result.scalars().all()
    items = await _attach_user_status(flashcards, user_id, db)

    items.sort(key=lambda x: _STATUS_ORDER.get(x.user_status or "new", 0))
    return items


@router.get("/{flashcard_id}", response_model=FlashcardOut)
async def get_flashcard(
    flashcard_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Tek flashcard detayı."""
    result = await db.execute(select(Flashcard).where(Flashcard.id == flashcard_id))
    fc = result.scalar_one_or_none()
    if not fc:
        raise HTTPException(status_code=404, detail="Flashcard bulunamadı")

    prog_result = await db.execute(
        select(FlashcardProgress).where(
            FlashcardProgress.user_id == user_id,
            FlashcardProgress.flashcard_id == flashcard_id,
        )
    )
    prog = prog_result.scalar_one_or_none()

    return FlashcardOut(
        id=fc.id,
        case_id=fc.case_id,
        specialty=fc.specialty,
        difficulty=fc.difficulty,
        topic=fc.topic,
        question=fc.question,
        answer=fc.answer,
        key_points=fc.key_points or [],
        tus_reference=fc.tus_reference,
        created_at=fc.created_at,
        user_status=prog.status if prog else "new",
    )


@router.post("/{flashcard_id}/progress")
async def update_progress(
    flashcard_id: str,
    data: FlashcardProgressUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Kartı işaretle: new / learning / known."""
    if data.status not in ("new", "learning", "known"):
        raise HTTPException(status_code=400, detail="Geçersiz status. new/learning/known olmalı")

    fc_result = await db.execute(select(Flashcard).where(Flashcard.id == flashcard_id))
    if not fc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Flashcard bulunamadı")

    prog_result = await db.execute(
        select(FlashcardProgress).where(
            FlashcardProgress.user_id == user_id,
            FlashcardProgress.flashcard_id == flashcard_id,
        )
    )
    prog = prog_result.scalar_one_or_none()

    if prog:
        prog.status = FlashcardStatus(data.status)
        prog.times_seen += 1
        prog.last_seen_at = datetime.now(timezone.utc)
    else:
        prog = FlashcardProgress(
            user_id=user_id,
            flashcard_id=flashcard_id,
            status=FlashcardStatus(data.status),
            times_seen=1,
            last_seen_at=datetime.now(timezone.utc),
        )
        db.add(prog)

    await db.commit()
    return {"message": "İlerleme güncellendi", "status": data.status}
