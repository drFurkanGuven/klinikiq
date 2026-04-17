"""Topluluk not akışı — listeleme (herkese açık), oluşturma (giriş gerekli)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users import mask_name
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import CommunityNote, User
from app.schemas.schemas import CommunityNoteCreate, CommunityNoteOut

router = APIRouter()

EXCERPT_LEN = 280


def _make_excerpt(body: str) -> str:
    b = (body or "").strip()
    if len(b) <= EXCERPT_LEN:
        return b
    return b[:EXCERPT_LEN].rstrip() + "…"


@router.get("/notes", response_model=List[CommunityNoteOut])
async def list_community_notes(
    group: Optional[str] = Query(None, description="temel veya klinik"),
    branch_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    if group is not None and group not in ("temel", "klinik"):
        raise HTTPException(status_code=400, detail="group: temel veya klinik olmalı")

    stmt = select(CommunityNote, User).join(User, CommunityNote.user_id == User.id)

    if group in ("temel", "klinik"):
        stmt = stmt.where(CommunityNote.tus_group == group)
    if branch_id:
        stmt = stmt.where(CommunityNote.branch_id == branch_id)
    if topic_id:
        stmt = stmt.where(CommunityNote.topic_id == topic_id)
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                CommunityNote.title.ilike(term),
                CommunityNote.body.ilike(term),
            )
        )

    stmt = stmt.order_by(desc(CommunityNote.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = result.all()

    return [
        CommunityNoteOut(
            id=note.id,
            group=note.tus_group,
            branch_id=note.branch_id,
            topic_id=note.topic_id,
            title=note.title,
            excerpt=_make_excerpt(note.body),
            author_display=mask_name(user.name),
            likes=0,
            saved=0,
            created_at=note.created_at,
        )
        for note, user in rows
    ]


@router.post("/notes", response_model=CommunityNoteOut)
async def create_community_note(
    data: CommunityNoteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    note = CommunityNote(
        user_id=user_id,
        tus_group=data.group,
        branch_id=data.branch_id.strip(),
        topic_id=data.topic_id.strip(),
        title=data.title.strip(),
        body=data.body.strip(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return CommunityNoteOut(
        id=note.id,
        group=note.tus_group,
        branch_id=note.branch_id,
        topic_id=note.topic_id,
        title=note.title,
        excerpt=_make_excerpt(note.body),
        author_display=mask_name(user.name),
        likes=0,
        saved=0,
        created_at=note.created_at,
    )
