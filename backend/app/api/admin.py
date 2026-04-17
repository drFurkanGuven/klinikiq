import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.tile_files import iter_dzi_relative_paths, remove_dzi_bundle
from app.models.models import User
from app.schemas.schemas import HistologyImageOut

router = APIRouter()

# ── Schemas ──
class UserAdminView(BaseModel):
    id: str
    name: str
    email: str
    school: str | None
    year: int | None
    is_admin: bool
    daily_limit: int

class UpdateLimitRequest(BaseModel):
    daily_limit: int


class RegisterDziIn(BaseModel):
    """TILES_DIR altındaki göreli yol, örn. open_histology/ornek.dzi"""

    relative_path: str
    title: str
    specialty: str | None = None


class OrphanDziOut(BaseModel):
    relative_path: str
    image_url: str
    has_thumb: bool

# ── Admin Dependency ──
async def get_current_admin_user(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler erişebilir")
    return user

# ── Endpoints ──
@router.get("/users", response_model=List[UserAdminView])
async def list_users(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Tüm kullanıcıları listele."""
    stmt = select(User).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/users/{target_id}/limit")
async def update_user_limit(
    target_id: str,
    req: UpdateLimitRequest,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının günlük limitini güncelle."""
    stmt = select(User).where(User.id == target_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    # [AİDER] Input validation: Limit negatif olamaz ve makul bir SINIRDA olmalı
    if req.daily_limit < 0 or req.daily_limit > 1000:
        raise HTTPException(status_code=400, detail="Geçersiz limit değeri (0-1000 arası olmalı)")

    # [AİDER] Audit Logging: Admin işlemini logla
    from datetime import datetime
    print(f"[AUDIT] {datetime.now()}: Admin {admin.email} (ID: {admin.id}) changed limit for {target_user.email} from {target_user.daily_limit} to {req.daily_limit}")

    target_user.daily_limit = req.daily_limit
    await db.commit()
    
    return {"message": "Limit başarıyla güncellendi", "new_limit": target_user.daily_limit}

@router.delete("/images/{image_id}", status_code=204)
async def admin_delete_image(
    image_id: str,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin panelinden histoloji görüntüsünü sil."""
    from app.models.models import HistologyImage

    result = await db.execute(select(HistologyImage).where(HistologyImage.id == image_id))
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    remove_dzi_bundle(settings.TILES_DIR, image.image_url)

    await db.delete(image)
    await db.commit()
    await _invalidate_histology_list_cache()
    return None


def _normalize_tile_rel(path: str) -> str:
    p = path.replace("\\", "/").strip().lstrip("/")
    if not p or ".." in p:
        raise HTTPException(status_code=400, detail="Geçersiz dosya yolu")
    if not p.lower().endswith(".dzi"):
        raise HTTPException(status_code=400, detail="Yalnızca .dzi dosyası kaydedilebilir")
    return p


async def _invalidate_histology_list_cache() -> None:
    try:
        from app.api.microscope import CACHE_KEY_LIST, redis_client

        if redis_client:
            await redis_client.delete(CACHE_KEY_LIST)
    except Exception as e:
        print(f"[admin] redis cache invalidate: {e}")


@router.get("/histology-images", response_model=List[HistologyImageOut])
async def list_all_histology_images(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Önbellek kullanmadan tüm histoloji kayıtları (admin paneli)."""
    from app.models.models import HistologyImage

    result = await db.execute(select(HistologyImage).order_by(HistologyImage.created_at.desc()))
    rows = result.scalars().all()
    return rows


@router.get("/tiles/orphan-dzi", response_model=List[OrphanDziOut])
async def list_orphan_dzi_files(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Veritabanında kaydı olmayan .dzi dosyaları (diskte var, DB'de yok)."""
    from app.models.models import HistologyImage

    r = await db.execute(select(HistologyImage.image_url))
    known = {row[0] for row in r.all() if row[0]}

    out: List[OrphanDziOut] = []
    td = settings.TILES_DIR
    for rel in iter_dzi_relative_paths(td):
        image_url = f"/tiles/{rel}"
        if image_url in known:
            continue
        dirname, fname = os.path.split(rel)
        stem = os.path.splitext(fname)[0]
        thumb_rel = os.path.join(dirname, f"{stem}_thumb.jpg") if dirname else f"{stem}_thumb.jpg"
        has_thumb = os.path.isfile(os.path.join(td, thumb_rel))
        out.append(
            OrphanDziOut(relative_path=rel, image_url=image_url, has_thumb=has_thumb)
        )
    return out


@router.post("/tiles/register-dzi", response_model=HistologyImageOut, status_code=201)
async def register_dzi_tile(
    body: RegisterDziIn,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Diskteki bir .dzi için veritabanı kaydı oluşturur."""
    from app.models.models import HistologyImage

    rel = _normalize_tile_rel(body.relative_path)
    abs_dzi = os.path.join(settings.TILES_DIR, rel)
    if not os.path.isfile(abs_dzi):
        raise HTTPException(status_code=404, detail=f"Dosya bulunamadı: {rel}")

    image_url = f"/tiles/{rel}"
    existing = await db.execute(select(HistologyImage).where(HistologyImage.image_url == image_url))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu yol zaten kayıtlı")

    dirname, fname = os.path.split(rel)
    stem = os.path.splitext(fname)[0]
    thumb_rel = os.path.join(dirname, f"{stem}_thumb.jpg") if dirname else f"{stem}_thumb.jpg"
    thumb_fs = os.path.join(settings.TILES_DIR, thumb_rel)
    thumbnail_url = f"/tiles/{thumb_rel}" if os.path.isfile(thumb_fs) else None

    img = HistologyImage(
        title=body.title.strip(),
        description=None,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        specialty=body.specialty.strip() if body.specialty else None,
        asset_source="upload",
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)
    await _invalidate_histology_list_cache()
    return img
