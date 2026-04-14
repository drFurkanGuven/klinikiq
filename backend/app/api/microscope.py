import asyncio
import os
import re
import shutil
import subprocess
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import HistologyImage, Annotation, User
from app.schemas.schemas import (
    HistologyImageOut,
    HistologyImageCreate,
    AnnotationCreate,
    AnnotationOut,
)

# Redis client placeholder
try:
    import redis.asyncio as redis
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except ImportError:
    redis_client = None

CACHE_KEY_LIST = "microscope:images:list"
CACHE_TTL = 3600  # 1 hour


def _slugify(text: str) -> str:
    """Türkçe karakterleri ASCII'ye dönüştüren güvenli dosya ismi oluşturucu."""
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ ", "cgiosuCGIOSU_")
    text = text.translate(tr_map)
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text).strip("_")
    return text[:60]


def _run_vips_dzsave(tiff_path: str, output_base: str) -> None:
    """Synchronous vips call — matches convert_to_dzi.py logic."""
    if not shutil.which("vips"):
        raise RuntimeError("vips bulunamadı. Lütfen 'apt-get install libvips-tools' ile kurun.")
    
    # DZI Dönüştürme (Orijinal Script Ayarları)
    subprocess.run(
        [
            "vips", "dzsave", tiff_path, output_base,
            "--tile-size", "256",
            "--overlap", "1",
            "--suffix", ".jpg[Q=85]",
        ],
        check=True,
    )
    
    # Nginx'in okuyabilmesi için izinleri ayarla
    try:
        subprocess.run(["chmod", "-R", "755", f"{output_base}.dzi"], check=False)
        subprocess.run(["chmod", "-R", "755", f"{output_base}_files"], check=False)
    except Exception:
        pass
    
    # Opsiyonel: Thumbnail Üretimi (FE listesi için)
    try:
        thumb_path = f"{output_base}_thumb.jpg"
        subprocess.run(
            ["vips", "thumbnail", tiff_path, thumb_path, "400"],
            check=True,
        )
    except Exception:
        pass # Thumbnail kritik değil, DZI oluştuysa devam et

router = APIRouter()


@router.get("/images", response_model=list[HistologyImageOut])
async def list_images(
    case_id: Optional[str] = None,
    specialty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    """Histolojik görüntü listesi. Vaka veya branşa göre filtrelenebilir."""
    # Cache kontrolü
    if redis_client and not case_id and not specialty:
        cached = await redis_client.get(CACHE_KEY_LIST)
        if cached:
            import json
            return json.loads(cached)

    query = select(HistologyImage).order_by(HistologyImage.created_at.desc())
    if case_id:
        query = query.where(HistologyImage.case_id == case_id)
    if specialty:
        query = query.where(HistologyImage.specialty == specialty)

    result = await db.execute(query)
    images = result.scalars().all()
    
    # Cache kayıt
    if redis_client and not case_id and not specialty:
        import json
        from fastapi.encoders import jsonable_encoder
        await redis_client.setex(
            CACHE_KEY_LIST, 
            CACHE_TTL, 
            json.dumps(jsonable_encoder(images))
        )
    
    return images


@router.get("/images/{image_id}", response_model=HistologyImageOut)
async def get_image(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(HistologyImage).where(HistologyImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")
    return image


@router.post("/images", response_model=HistologyImageOut, status_code=201)
async def create_image(
    data: HistologyImageCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Yeni histolojik görüntü ekle (sadece admin)."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Yetki gerekli")

    image = HistologyImage(**data.model_dump())
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.post("/images/upload", response_model=HistologyImageOut, status_code=201)
async def upload_tiff_image(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    specialty: str = Form(""),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """TIFF dosyasını yükle, DZI'ye dönüştür ve veritabanına ekle (sadece admin)."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Yetki gerekli")

    # Sadece TIFF / genel image formatlarına izin ver
    allowed = {"image/tiff", "image/tif", "application/octet-stream", "image/jpeg", "image/png"}
    content_type = file.content_type or ""
    filename_lower = (file.filename or "").lower()
    is_tiff = filename_lower.endswith((".tiff", ".tif", ".svs", ".ndpi"))
    if content_type not in allowed and not is_tiff:
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya tipi. TIFF/TIF yükleyin.")

    os.makedirs(settings.TILES_DIR, exist_ok=True)
    slug = _slugify(title) or "image"

    # Çakışma kontrolü
    counter = 0
    while True:
        name = slug if counter == 0 else f"{slug}_{counter}"
        dzi_path = os.path.join(settings.TILES_DIR, f"{name}.dzi")
        if not os.path.exists(dzi_path):
            break
        counter += 1

    # Geçici dosyaya kaydet
    suffix = os.path.splitext(file.filename or "upload.tiff")[1] or ".tiff"
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        tmp_file.write(content)
        tmp_file.close()

        output_base = os.path.join(settings.TILES_DIR, name)

        # vips'i thread pool'da çalıştır (blocking)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_vips_dzsave, tmp_file.name, output_base)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        os.unlink(tmp_file.name)

    dzi_url = f"/tiles/{name}.dzi"
    thumb_url = f"/tiles/{name}_thumb.jpg"

    # Cache geçersiz kılma
    if redis_client:
        await redis_client.delete(CACHE_KEY_LIST)

    image = HistologyImage(
        title=title.strip(),
        description=description.strip() or None,
        image_url=dzi_url,
        thumbnail_url=thumb_url,
        specialty=specialty or None,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Histolojik görüntüyü sil (sadece admin)."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Yetki gerekli")

    result = await db.execute(select(HistologyImage).where(HistologyImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    await db.delete(image)
    await db.commit()


@router.get("/images/{image_id}/annotations", response_model=list[AnnotationOut])
async def list_annotations(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    """Bir görüntüdeki tüm annotationları getir."""
    image_result = await db.execute(
        select(HistologyImage).where(HistologyImage.id == image_id)
    )
    if not image_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    result = await db.execute(
        select(Annotation)
        .where(Annotation.image_id == image_id)
        .order_by(Annotation.created_at.asc())
    )
    return result.scalars().all()


@router.post("/images/{image_id}/annotations", response_model=AnnotationOut, status_code=201)
async def add_annotation(
    image_id: str,
    data: AnnotationCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Görüntüye annotation ekle."""
    image_result = await db.execute(
        select(HistologyImage).where(HistologyImage.id == image_id)
    )
    if not image_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    annotation = Annotation(image_id=image_id, user_id=user_id, **data.model_dump())
    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)
    return annotation


@router.delete("/images/{image_id}/annotations/{annotation_id}", status_code=204)
async def delete_annotation(
    image_id: str,
    annotation_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Kendi annotationını sil."""
    result = await db.execute(
        select(Annotation).where(
            Annotation.id == annotation_id,
            Annotation.image_id == image_id,
        )
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation bulunamadı")
    if annotation.user_id != user_id:
        raise HTTPException(status_code=403, detail="Sadece kendi annotationını silebilirsin")

    await db.delete(annotation)
    await db.commit()
