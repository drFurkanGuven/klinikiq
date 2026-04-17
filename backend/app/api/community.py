"""Not akışı — listeleme, oluşturma, beğeni (herkese açık toplam), kaydet (kişisel)."""

from typing import List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users import mask_name
from app.core.database import get_db
from app.core.security import get_current_user_id, get_optional_user_id
from app.services.tus_taxonomy import get_taxonomy_payload, validate_classification
from app.models.models import (
    CommunityNote,
    CommunityNoteLike,
    CommunityNoteSave,
    User,
)
from app.schemas.schemas import (
    CommunityNoteCreate,
    CommunityNoteDetailOut,
    CommunityNoteOut,
    CommunityNoteUpdate,
    ToggleLikeOut,
    ToggleSaveOut,
)

router = APIRouter()

EXCERPT_LEN = 280


@router.get("/taksonomi")
async def get_taksonomi():
    """TUS dal/konu ağacı (not etiketleme ve arama ile uyumlu). Herkese açık."""
    return get_taxonomy_payload()


def _make_excerpt(body: str) -> str:
    b = (body or "").strip()
    if len(b) <= EXCERPT_LEN:
        return b
    return b[:EXCERPT_LEN].rstrip() + "…"


async def _like_counts_map(db: AsyncSession, note_ids: List[str]) -> dict[str, int]:
    if not note_ids:
        return {}
    r = await db.execute(
        select(CommunityNoteLike.note_id, func.count())
        .where(CommunityNoteLike.note_id.in_(note_ids))
        .group_by(CommunityNoteLike.note_id)
    )
    return {row[0]: int(row[1]) for row in r.all()}


async def _liked_and_saved_sets(
    db: AsyncSession, note_ids: List[str], user_id: str
) -> tuple[Set[str], Set[str]]:
    if not note_ids:
        return set(), set()
    rl = await db.execute(
        select(CommunityNoteLike.note_id).where(
            CommunityNoteLike.note_id.in_(note_ids),
            CommunityNoteLike.user_id == user_id,
        )
    )
    rs = await db.execute(
        select(CommunityNoteSave.note_id).where(
            CommunityNoteSave.note_id.in_(note_ids),
            CommunityNoteSave.user_id == user_id,
        )
    )
    return {row[0] for row in rl.all()}, {row[0] for row in rs.all()}


def _build_note_out(
    note: CommunityNote,
    user: User,
    *,
    like_count: int,
    liked_by_me: bool,
    saved_by_me: bool,
    viewer_id: Optional[str],
) -> CommunityNoteOut:
    is_mine = viewer_id is not None and note.user_id == viewer_id
    return CommunityNoteOut(
        id=note.id,
        group=note.tus_group,
        branch_id=note.branch_id,
        topic_id=note.topic_id,
        title=note.title,
        excerpt=_make_excerpt(note.body),
        author_display=mask_name(user.name),
        likes=like_count,
        liked_by_me=liked_by_me,
        saved_by_me=saved_by_me,
        is_mine=is_mine,
        created_at=note.created_at,
    )


async def _list_core(
    db: AsyncSession,
    viewer_id: Optional[str],
    *,
    group: Optional[str],
    branch_id: Optional[str],
    topic_id: Optional[str],
    q: Optional[str],
    limit: int,
    offset: int,
    saved_only_user_id: Optional[str] = None,
):
    if group is not None and group not in ("temel", "klinik"):
        raise HTTPException(status_code=400, detail="group: temel veya klinik olmalı")

    stmt = select(CommunityNote, User).join(User, CommunityNote.user_id == User.id)

    if saved_only_user_id is not None:
        stmt = stmt.join(
            CommunityNoteSave,
            (CommunityNoteSave.note_id == CommunityNote.id)
            & (CommunityNoteSave.user_id == saved_only_user_id),
        )

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
    note_ids = [n.id for n, _ in rows]
    lc_map = await _like_counts_map(db, note_ids)
    liked_set: Set[str] = set()
    saved_set: Set[str] = set()
    if viewer_id and note_ids:
        liked_set, saved_set = await _liked_and_saved_sets(db, note_ids, viewer_id)

    out: List[CommunityNoteOut] = []
    for note, user in rows:
        out.append(
            _build_note_out(
                note,
                user,
                like_count=lc_map.get(note.id, 0),
                liked_by_me=note.id in liked_set,
                saved_by_me=note.id in saved_set,
                viewer_id=viewer_id,
            )
        )
    return out


@router.get("/notes", response_model=List[CommunityNoteOut])
async def list_notes(
    group: Optional[str] = Query(None, description="temel veya klinik"),
    branch_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    viewer_id: Optional[str] = Depends(get_optional_user_id),
):
    return await _list_core(
        db,
        viewer_id,
        group=group,
        branch_id=branch_id,
        topic_id=topic_id,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/me/kaydedilenler", response_model=List[CommunityNoteOut])
async def list_my_saved_notes(
    group: Optional[str] = Query(None),
    branch_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await _list_core(
        db,
        user_id,
        group=group,
        branch_id=branch_id,
        topic_id=topic_id,
        q=q,
        limit=limit,
        offset=offset,
        saved_only_user_id=user_id,
    )


@router.post("/notes", response_model=CommunityNoteOut)
async def create_note(
    data: CommunityNoteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    validate_classification(
        data.group,
        data.branch_id.strip(),
        data.topic_id.strip(),
    )

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

    return _build_note_out(
        note,
        user,
        like_count=0,
        liked_by_me=False,
        saved_by_me=False,
        viewer_id=user_id,
    )


async def _note_to_detail_out(
    db: AsyncSession,
    note: CommunityNote,
    user: User,
    viewer_id: Optional[str],
) -> CommunityNoteDetailOut:
    lc_map = await _like_counts_map(db, [note.id])
    liked_set: Set[str] = set()
    saved_set: Set[str] = set()
    if viewer_id:
        liked_set, saved_set = await _liked_and_saved_sets(db, [note.id], viewer_id)
    base = _build_note_out(
        note,
        user,
        like_count=lc_map.get(note.id, 0),
        liked_by_me=note.id in liked_set,
        saved_by_me=note.id in saved_set,
        viewer_id=viewer_id,
    )
    return CommunityNoteDetailOut(**base.model_dump(), body=note.body)


@router.get("/notes/{note_id}", response_model=CommunityNoteDetailOut)
async def get_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    viewer_id: Optional[str] = Depends(get_optional_user_id),
):
    result = await db.execute(
        select(CommunityNote, User)
        .join(User, CommunityNote.user_id == User.id)
        .where(CommunityNote.id == note_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Not bulunamadı")
    note, user = row
    return await _note_to_detail_out(db, note, user, viewer_id)


@router.patch("/notes/{note_id}", response_model=CommunityNoteDetailOut)
async def update_note(
    note_id: str,
    data: CommunityNoteUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(CommunityNote).where(CommunityNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı")
    if note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Bu notu düzenleyemezsin")

    g = data.group if data.group is not None else note.tus_group
    b = data.branch_id.strip() if data.branch_id is not None else note.branch_id
    t = data.topic_id.strip() if data.topic_id is not None else note.topic_id
    if data.group is not None or data.branch_id is not None or data.topic_id is not None:
        validate_classification(g, b, t)

    if data.title is not None:
        note.title = data.title.strip()
    if data.body is not None:
        note.body = data.body.strip()
    note.tus_group = g
    note.branch_id = b
    note.topic_id = t

    await db.commit()
    await db.refresh(note)

    ur = await db.execute(select(User).where(User.id == note.user_id))
    user = ur.scalar_one()
    return await _note_to_detail_out(db, note, user, user_id)


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(CommunityNote).where(CommunityNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı")
    if note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Bu notu silemezsin")
    await db.delete(note)
    await db.commit()
    return Response(status_code=204)


@router.post("/notes/{note_id}/like", response_model=ToggleLikeOut)
async def toggle_like(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(CommunityNote).where(CommunityNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı")
    if note.user_id == user_id:
        raise HTTPException(status_code=400, detail="Kendi notunu beğenemezsin")

    result = await db.execute(
        select(CommunityNoteLike).where(
            CommunityNoteLike.note_id == note_id,
            CommunityNoteLike.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        await db.delete(row)
        liked = False
    else:
        db.add(CommunityNoteLike(user_id=user_id, note_id=note_id))
        liked = True
    await db.commit()

    cnt = await db.scalar(
        select(func.count()).select_from(CommunityNoteLike).where(CommunityNoteLike.note_id == note_id)
    )
    return ToggleLikeOut(liked=liked, likes=int(cnt or 0))


@router.post("/notes/{note_id}/kaydet", response_model=ToggleSaveOut)
async def toggle_save(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(CommunityNote).where(CommunityNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı")

    result = await db.execute(
        select(CommunityNoteSave).where(
            CommunityNoteSave.note_id == note_id,
            CommunityNoteSave.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        await db.delete(row)
        saved = False
    else:
        db.add(CommunityNoteSave(user_id=user_id, note_id=note_id))
        saved = True
    await db.commit()
    return ToggleSaveOut(saved=saved)
