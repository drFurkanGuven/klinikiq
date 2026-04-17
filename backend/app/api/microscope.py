import asyncio
import os
import re
import shutil
import subprocess
import tempfile

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.config import settings
from app.core.tile_files import remove_dzi_bundle
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

CACHE_KEY_LIST = "microscope:images:list:v3"
CACHE_TTL = 3600  # 1 hour


def _slugify(text: str) -> str:
    """Türkçe karakterleri ASCII'ye dönüştüren ve path traversal'ı engelleyen güvenli dosya ismi oluşturucu."""
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ ", "cgiosuCGIOSU_")
    text = text.translate(tr_map)
    text = text.lower()
    # Sadece alfanümerik ve alt çizgi/tire
    text = re.sub(r"[^\w\s-]", "", text)
    # Boşlukları ve tekrarlayan işaretleri temizle
    text = re.sub(r"[\s_-]+", "_", text).strip("_")
    # Path traversal engelleme: Sadece dosya adı döner, dizin geçişi içermez
    text = os.path.basename(text)
    return text[:60]


def _run_vips_dzsave(tiff_path: str, output_base: str) -> None:
    """Synchronous vips call — matches convert_to_dzi.py logic."""
    if not shutil.which("vips"):
        raise RuntimeError("vips bulunamadı. Lütfen 'apt-get install libvips-tools' ile kurun.")
    
    # DZI Dönüştürme (Orijinal Script Ayarları) - 5 Dakika Sınırı (300s)
    subprocess.run(
        [
            "vips", "dzsave", tiff_path, output_base,
            "--tile-size", "256",
            "--overlap", "1",
            "--suffix", ".jpg[Q=85]",
        ],
        check=True,
        timeout=300,
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
            timeout=60,
        )
    except Exception as e:
        print(f"Thumbnail uretimi basarisiz (kritik degil): {e}")


async def ingest_local_file_as_dzi(
    local_source_path: str,
    title: str,
    description: Optional[str],
    specialty: Optional[str],
    db: AsyncSession,
    asset_source: str = "upload",
) -> HistologyImage:
    """
    Yerel bir WSI dosyasından (TIFF/TIF/SVS/NDPI vb.) Deep Zoom (DZI) üretir ve veritabanına kaydeder.
    Upload ve Hugging Face içe aktarma ortak kullanır.
    """
    os.makedirs(settings.TILES_DIR, exist_ok=True)
    slug = _slugify(title) or "image"
    counter = 0
    while True:
        name = slug if counter == 0 else f"{slug}_{counter}"
        dzi_path = os.path.join(settings.TILES_DIR, f"{name}.dzi")
        if not os.path.exists(dzi_path):
            break
        counter += 1

    output_base = os.path.join(settings.TILES_DIR, name)
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _run_vips_dzsave, local_source_path, output_base)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    dzi_url = f"/tiles/{name}.dzi"
    thumb_url = f"/tiles/{name}_thumb.jpg"

    if redis_client:
        await redis_client.delete(CACHE_KEY_LIST)

    image = HistologyImage(
        title=title.strip(),
        description=(description or "").strip() or None,
        image_url=dzi_url,
        thumbnail_url=thumb_url,
        specialty=specialty or None,
        asset_source=asset_source,
    )
    try:
        db.add(image)
        await db.commit()
        await db.refresh(image)
        return image
    except Exception as e:
        print(f"DB Kayit Hatasi (Dosyalar temizleniyor): {e}")
        try:
            filename = f"{name}.dzi"
            files_dir = f"{name}_files"
            thumb_file = f"{name}_thumb.jpg"
            for path in [os.path.join(settings.TILES_DIR, f) for f in [filename, files_dir, thumb_file]]:
                if os.path.exists(path):
                    if os.path.isdir(path):
                        shutil.rmtree(path)
                    else:
                        os.remove(path)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="Görüntü veritabanına kaydedilirken hata oluştu.",
        ) from e


router = APIRouter()


@router.get("/images", response_model=list[HistologyImageOut])
async def list_images(
    case_id: Optional[str] = None,
    specialty: Optional[str] = None,
    stain: Optional[str] = None,
    organ: Optional[str] = None,
    asset_source: Optional[str] = None,
    curriculum_track: Optional[str] = None,
    science_unit: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    """Histolojik görüntü listesi. Vaka, branş, boya, organ, müfredat veya kaynağa göre filtrelenebilir."""
    use_cache = not any(
        [case_id, specialty, stain, organ, asset_source, curriculum_track, science_unit]
    )
    # Cache kontrolü
    if redis_client and use_cache:
        cached = await redis_client.get(CACHE_KEY_LIST)
        if cached:
            import json
            return json.loads(cached)

    from sqlalchemy import cast, String
    query = select(HistologyImage).order_by(HistologyImage.created_at.desc())
    if case_id:
        query = query.where(HistologyImage.case_id == case_id)
    if specialty:
        query = query.where(cast(HistologyImage.specialty, String) == specialty)
    if stain:
        query = query.where(cast(HistologyImage.stain, String) == stain)
    if organ:
        query = query.where(cast(HistologyImage.organ, String) == organ)
    if asset_source:
        query = query.where(cast(HistologyImage.asset_source, String) == asset_source)
    if curriculum_track == "clinical":
        query = query.where(HistologyImage.curriculum_track.is_(None))
    elif curriculum_track:
        query = query.where(cast(HistologyImage.curriculum_track, String) == curriculum_track)
    if science_unit:
        query = query.where(cast(HistologyImage.science_unit, String) == science_unit)

    result = await db.execute(query)
    images = result.scalars().all()
    
    # Cache kayıt
    if redis_client and use_cache:
        import json
        from fastapi.encoders import jsonable_encoder
        await redis_client.setex(
            CACHE_KEY_LIST, 
            CACHE_TTL, 
            json.dumps(jsonable_encoder(images))
        )
    
    return images


@router.get("/explore/huggingface")
async def explore_huggingface_datasets(
    q: str = Query("histopathology", description="Hugging Face Hub arama terimi"),
    limit: int = Query(12, ge=1, le=30),
    _: str = Depends(get_current_user_id),
):
    """
    Hugging Face Hub'da açık histopatoloji / WSI veri kümelerini listeler (salt okuma).
    Görüntü dosyası indirmez; kullanıcıyı keşif ve atıf için yönlendirir.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                "https://huggingface.co/api/datasets",
                params={"search": q, "limit": limit},
            )
            r.raise_for_status()
            rows = r.json()
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Hugging Face API erişilemedi: {e!s}",
        ) from e

    out = []
    for d in rows[:limit]:
        did = d.get("id") or ""
        desc = (d.get("description") or "").replace("\n", " ").strip()
        if len(desc) > 220:
            desc = desc[:217] + "…"
        out.append(
            {
                "id": did,
                "downloads": d.get("downloads") or 0,
                "likes": d.get("likes") or 0,
                "url": f"https://huggingface.co/datasets/{did}" if did else "",
                "description": desc,
            }
        )
    return {"query": q, "datasets": out}


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

    suffix = os.path.splitext(file.filename or "upload.tiff")[1] or ".tiff"
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        tmp_file.write(content)
        tmp_file.close()
        return await ingest_local_file_as_dzi(
            tmp_file.name,
            title,
            description,
            specialty,
            db,
            asset_source="upload",
        )
    finally:
        try:
            os.unlink(tmp_file.name)
        except OSError:
            pass


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

    remove_dzi_bundle(settings.TILES_DIR, image.image_url)

    await db.delete(image)
    await db.commit()

    if redis_client:
        await redis_client.delete(CACHE_KEY_LIST)


@router.get("/images/{image_id}/annotations", response_model=list[AnnotationOut])
async def list_annotations(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Bir görüntüdeki sadece kendi annotationlarını getir."""
    image_result = await db.execute(
        select(HistologyImage).where(HistologyImage.id == image_id)
    )
    if not image_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    result = await db.execute(
        select(Annotation)
        .where(
            Annotation.image_id == image_id,
            Annotation.user_id == user_id
        )
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
