import asyncio
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
from app.schemas.schemas import HistologyImageOut, HistologyImagePatch

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


class HfTiffImportIn(BaseModel):
    """Hugging Face Hub üzerinden TIFF/SVS/NDPI indirip sunucuda DZI üretir."""

    repo_id: str
    path_in_repo: str
    title: str
    description: str | None = None
    specialty: str | None = None
    stain: str | None = None
    organ: str | None = None
    curriculum_track: str | None = None
    science_unit: str | None = None
    repo_type: str = "dataset"


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


@router.patch("/histology-images/{image_id}", response_model=HistologyImageOut)
async def patch_histology_image(
    image_id: str,
    body: HistologyImagePatch,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Başlık ve/veya açıklama güncelle (diskteki DZI dosyalarına dokunulmaz)."""
    from app.models.models import HistologyImage

    if body.title is None and body.description is None:
        raise HTTPException(
            status_code=400,
            detail="Güncellenecek alan yok (title veya description gönderin).",
        )

    result = await db.execute(select(HistologyImage).where(HistologyImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    if body.title is not None:
        t = body.title.strip()
        if not t:
            raise HTTPException(status_code=400, detail="Başlık boş olamaz.")
        image.title = t
    if body.description is not None:
        image.description = body.description.strip() or None

    await db.commit()
    await db.refresh(image)
    await _invalidate_histology_list_cache()
    return image


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


@router.post("/hf/import-tiff", response_model=HistologyImageOut, status_code=201)
async def import_tiff_from_huggingface(
    body: HfTiffImportIn,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Hugging Face'ten tek bir dosya indirir (TIFF/SVS/NDPI), libvips ile DZI üretir, /tiles altına yazar.
    Önceden hazır DZI paketi olan veri kümeleri nadir; çoğu zaman pyramidal TIFF veya SVS kullanılır.
    Kapalı veri kümeleri için sunucuda HF_TOKEN ortam değişkeni ayarlayın.
    """
    from app.api.microscope import ingest_local_file_as_dzi

    if body.repo_type not in ("dataset", "model"):
        raise HTTPException(status_code=400, detail="repo_type 'dataset' veya 'model' olmalıdır")

    try:
        from huggingface_hub import hf_hub_download
    except ImportError as e:
        raise HTTPException(
            status_code=501,
            detail="huggingface_hub kurulu değil. pip install huggingface_hub",
        ) from e

    def _download() -> str:
        return hf_hub_download(
            repo_id=body.repo_id.strip(),
            filename=body.path_in_repo.strip().lstrip("/"),
            repo_type=body.repo_type,
            token=settings.HF_TOKEN or None,
        )

    loop = asyncio.get_event_loop()
    try:
        local_path = await loop.run_in_executor(None, _download)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Hugging Face indirilemedi (repo, yol veya token kontrolü): {e!s}",
        ) from e

    return await ingest_local_file_as_dzi(
        local_path,
        body.title,
        body.description,
        body.specialty,
        db,
        asset_source="huggingface",
        stain=body.stain,
        organ=body.organ,
        curriculum_track=body.curriculum_track,
        science_unit=body.science_unit,
    )
