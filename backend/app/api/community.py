"""Not akışı — listeleme, oluşturma, beğeni (herkese açık toplam), kaydet (kişisel)."""

import os
from collections import defaultdict
from typing import List, Literal, Optional, Set, cast

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users import mask_name
from app.core.database import get_db
from app.core.paths import community_uploads_abs
from app.core.security import get_current_user_id, get_optional_user_id
from app.services.tus_taxonomy import get_taxonomy_payload, validate_classification
from app.models.models import (
    CommunityNote,
    CommunityNoteAttachment,
    CommunityNoteLike,
    CommunityNoteSave,
    User,
    gen_uuid,
)
from app.schemas.schemas import (
    CommunityNoteCreate,
    CommunityNoteDetailOut,
    CommunityNoteOut,
    CommunityNoteUpdate,
    NoteAttachmentOut,
    ToggleLikeOut,
    ToggleSaveOut,
)

router = APIRouter()

EXCERPT_LEN = 280
MAX_ATTACHMENTS_PER_NOTE = 12
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024  # 15 MB

MIME_TO_KIND = {
    "application/pdf": ("pdf", ".pdf"),
    "image/jpeg": ("image", ".jpg"),
    "image/png": ("image", ".png"),
    "image/gif": ("image", ".gif"),
    "image/webp": ("image", ".webp"),
}


@router.get("/taksonomi")
async def get_taksonomi():
    """TUS dal/konu ağacı (not etiketleme ve arama ile uyumlu). Herkese açık."""
    return get_taxonomy_payload()


def _make_excerpt(body: str) -> str:
    b = (body or "").strip()
    if len(b) <= EXCERPT_LEN:
        return b
    return b[:EXCERPT_LEN].rstrip() + "…"


def _body_truncated(body: str) -> bool:
    return len((body or "").strip()) > EXCERPT_LEN


def _attachment_to_out(row: CommunityNoteAttachment) -> NoteAttachmentOut:
    return NoteAttachmentOut(
        id=row.id,
        kind=row.kind,
        filename=row.original_filename,
        url=row.public_path,
        size_bytes=row.size_bytes,
    )


async def _attachments_by_note_ids(
    db: AsyncSession, note_ids: List[str]
) -> dict[str, List[CommunityNoteAttachment]]:
    if not note_ids:
        return {}
    r = await db.execute(
        select(CommunityNoteAttachment)
        .where(CommunityNoteAttachment.note_id.in_(note_ids))
        .order_by(CommunityNoteAttachment.created_at.asc())
    )
    m: dict[str, List[CommunityNoteAttachment]] = defaultdict(list)
    for row in r.scalars().all():
        m[row.note_id].append(row)
    return m


def _unlink_public_path(public_path: str) -> None:
    prefix = "/uploads/community-notes/"
    if not public_path.startswith(prefix):
        return
    rel = public_path[len(prefix) :].lstrip("/").replace("\\", "/")
    root = community_uploads_abs()
    fs = (root / rel).resolve()
    try:
        if fs.is_file() and str(fs).startswith(str(root)):
            fs.unlink()
    except OSError:
        pass


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


def _moderation_status_out(note: CommunityNote) -> str:
    ms = getattr(note, "moderation_status", None) or "published"
    if ms in ("pending", "published", "rejected"):
        return ms
    return "published"


async def _viewer_can_see_note(
    db: AsyncSession,
    note: CommunityNote,
    viewer_id: Optional[str],
) -> bool:
    if _moderation_status_out(note) == "published":
        return True
    if not viewer_id:
        return False
    if note.user_id == viewer_id:
        return True
    r = await db.execute(select(User.is_admin).where(User.id == viewer_id))
    row = r.one_or_none()
    if not row:
        return False
    return bool(row[0])


def _build_note_out(
    note: CommunityNote,
    user: User,
    *,
    like_count: int,
    liked_by_me: bool,
    saved_by_me: bool,
    viewer_id: Optional[str],
    attachments: Optional[List[CommunityNoteAttachment]] = None,
) -> CommunityNoteOut:
    is_mine = viewer_id is not None and note.user_id == viewer_id
    atts = [_attachment_to_out(a) for a in (attachments or [])]
    ms = _moderation_status_out(note)
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
        moderation_status=cast(Literal["pending", "published", "rejected"], ms),
        created_at=note.created_at,
        body_truncated=_body_truncated(note.body),
        attachments=atts,
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

    stmt = stmt.where(CommunityNote.moderation_status == "published")

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

    att_map = await _attachments_by_note_ids(db, note_ids)

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
                attachments=att_map.get(note.id, []),
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
        moderation_status="pending",
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
        attachments=[],
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
    att_map = await _attachments_by_note_ids(db, [note.id])
    base = _build_note_out(
        note,
        user,
        like_count=lc_map.get(note.id, 0),
        liked_by_me=note.id in liked_set,
        saved_by_me=note.id in saved_set,
        viewer_id=viewer_id,
        attachments=att_map.get(note.id, []),
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
    if not await _viewer_can_see_note(db, note, viewer_id):
        raise HTTPException(status_code=404, detail="Not bulunamadı")
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
    if _moderation_status_out(note) == "rejected":
        note.moderation_status = "pending"

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

    ar = await db.execute(
        select(CommunityNoteAttachment).where(CommunityNoteAttachment.note_id == note_id)
    )
    for att in ar.scalars().all():
        _unlink_public_path(att.public_path)

    await db.delete(note)
    await db.commit()
    return Response(status_code=204)


@router.post("/notes/{note_id}/attachments", response_model=NoteAttachmentOut, status_code=201)
async def upload_note_attachment(
    note_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Not sahibi PDF veya görsel yükler; dosya sunucuda kullanıcı/not klasöründe saklanır."""
    result = await db.execute(select(CommunityNote).where(CommunityNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı")
    if note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Bu nota dosya ekleyemezsin")

    cnt = await db.scalar(
        select(func.count())
        .select_from(CommunityNoteAttachment)
        .where(CommunityNoteAttachment.note_id == note_id)
    )
    if int(cnt or 0) >= MAX_ATTACHMENTS_PER_NOTE:
        raise HTTPException(
            status_code=400,
            detail=f"Not başına en fazla {MAX_ATTACHMENTS_PER_NOTE} dosya eklenebilir.",
        )

    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in MIME_TO_KIND:
        raise HTTPException(
            status_code=400,
            detail="Yalnızca PDF veya görsel (JPEG, PNG, GIF, WebP) yüklenebilir.",
        )
    kind, ext = MIME_TO_KIND[ct]

    raw = await file.read()
    if len(raw) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=400, detail="Dosya çok büyük (en fazla 15 MB).")

    aid = gen_uuid()
    safe_name = f"{aid}{ext}"
    rel_dir = os.path.join(user_id, note_id)
    root = community_uploads_abs()
    dest_dir = root / rel_dir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_fs = dest_dir / safe_name
    dest_fs.write_bytes(raw)

    orig = (file.filename or "dosya").replace("\\", "/").split("/")[-1][:200] or "dosya"
    public_path = f"/uploads/community-notes/{user_id}/{note_id}/{safe_name}"

    row = CommunityNoteAttachment(
        id=aid,
        note_id=note_id,
        user_id=user_id,
        kind=kind,
        original_filename=orig,
        content_type=ct,
        size_bytes=len(raw),
        public_path=public_path,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _attachment_to_out(row)


@router.delete("/notes/{note_id}/attachments/{attachment_id}", status_code=204)
async def delete_note_attachment(
    note_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(CommunityNoteAttachment).where(
            CommunityNoteAttachment.id == attachment_id,
            CommunityNoteAttachment.note_id == note_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Ek bulunamadı")
    if row.user_id != user_id:
        raise HTTPException(status_code=403, detail="Bu eki silemezsin")

    _unlink_public_path(row.public_path)
    await db.delete(row)
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
    if _moderation_status_out(note) != "published":
        raise HTTPException(status_code=400, detail="Yalnızca yayınlanmış notlar beğenilebilir.")
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
    if _moderation_status_out(note) != "published":
        raise HTTPException(status_code=400, detail="Yalnızca yayınlanmış notlar kaydedilebilir.")

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
