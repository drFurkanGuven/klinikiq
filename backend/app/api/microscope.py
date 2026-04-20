import asyncio
import math
import os
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from PIL import Image as PilImage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

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

_TILE_NAME_RE = re.compile(r"^(\d+)_(\d+)\.(jpg|jpeg|png)$", re.IGNORECASE)


def _xml_local_name(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def _parse_dzi_xml(dzi_path: Path) -> tuple[int, int, int, int, str]:
    """Width, Height, TileSize, Overlap, Format (lower)."""
    try:
        tree = ET.parse(dzi_path)
    except ET.ParseError as e:
        raise ValueError(f"DZI XML okunamadı: {e}") from e
    root = tree.getroot()
    tile_size = int(root.attrib.get("TileSize", "256"))
    overlap = int(root.attrib.get("Overlap", "0"))
    fmt = (root.attrib.get("Format", "jpg") or "jpg").lower()
    width = height = None
    for child in root:
        if _xml_local_name(child.tag) == "Size":
            width = int(child.attrib["Width"])
            height = int(child.attrib["Height"])
            break
    if width is None or height is None:
        raise ValueError("DZI Size bulunamadı")
    return width, height, tile_size, overlap, fmt


def _disk_max_level(stem_files: Path) -> int:
    if not stem_files.is_dir():
        return -1
    levels: list[int] = []
    for name in os.listdir(stem_files):
        if name.isdigit():
            levels.append(int(name))
    return max(levels) if levels else -1


def _tile_grid_dimensions(level_dir: Path) -> tuple[int, int]:
    max_i = max_j = -1
    for fn in os.listdir(level_dir):
        m = _TILE_NAME_RE.match(fn)
        if m:
            max_i = max(max_i, int(m.group(1)))
            max_j = max(max_j, int(m.group(2)))
    if max_i < 0:
        return (0, 0)
    return (max_i + 1, max_j + 1)


def _pick_preview_level(
    stem_files: Path, width: int, height: int
) -> int:
    """Ceil(log2(max(W,H))) seviyesinden başlayıp grid en fazla 4x4 olana kadar seviye düşür."""
    max_lvl = _disk_max_level(stem_files)
    if max_lvl < 0:
        raise FileNotFoundError("DZI karo klasörü yok")
    start = int(math.ceil(math.log2(max(width, height))))
    L = min(start, max_lvl)
    while L >= 0:
        ld = stem_files / str(L)
        if not ld.is_dir():
            L -= 1
            continue
        tx, ty = _tile_grid_dimensions(ld)
        if tx == 0 or ty == 0:
            L -= 1
            continue
        if tx <= 4 and ty <= 4:
            return L
        L -= 1
    return 0


def _lanczos_resample():
    try:
        return PilImage.Resampling.LANCZOS
    except AttributeError:
        return PilImage.LANCZOS


def _stitch_level_to_image(
    stem_files: Path,
    level: int,
    width: int,
    height: int,
    tile_size: int,
    overlap: int,
    max_level: int,
) -> PilImage.Image:
    level_dir = stem_files / str(level)
    if not level_dir.is_dir():
        raise FileNotFoundError(f"Seviye klasörü yok: {level}")

    step = max(1, tile_size - overlap)
    scale = 2 ** (max_level - level)
    wL = max(1, math.ceil(width / scale))
    hL = max(1, math.ceil(height / scale))

    canvas = PilImage.new("RGB", (wL, hL), (240, 240, 240))

    tiles: dict[tuple[int, int], Path] = {}
    for fn in os.listdir(level_dir):
        m = _TILE_NAME_RE.match(fn)
        if m:
            tiles[(int(m.group(1)), int(m.group(2)))] = level_dir / fn

    if not tiles:
        raise FileNotFoundError(f"Seviye {level} içinde karo yok")

    for (i, j) in sorted(tiles.keys()):
        path = tiles[(i, j)]
        tile = PilImage.open(path).convert("RGB")
        x = i * step
        y = j * step
        tw = min(tile.width, wL - x)
        th = min(tile.height, hL - y)
        if tw <= 0 or th <= 0:
            continue
        if tw < tile.width or th < tile.height:
            tile = tile.crop((0, 0, tw, th))
        canvas.paste(tile, (x, y))

    return canvas


def _ensure_dzi_preview_jpeg(tiles_dir: str, image_url: str) -> str:
    """
    DZI için _preview.jpg önbelleğini döndürür; yoksa üretir.
    image_url örn. /tiles/foo.dzi veya /tiles/sub/bar.dzi
    """
    if not image_url.startswith("/tiles/"):
        raise ValueError("Geçersiz image_url")
    rel = image_url[len("/tiles/") :].lstrip("/").replace("\\", "/")
    if not rel.lower().endswith(".dzi"):
        raise ValueError("Önizleme yalnızca DZI için")

    dzi_path = Path(tiles_dir) / rel
    if not dzi_path.is_file():
        raise FileNotFoundError("DZI dosyası bulunamadı")

    cache_path = dzi_path.parent / f"{dzi_path.stem}_preview.jpg"
    if cache_path.is_file() and cache_path.stat().st_size > 0:
        return str(cache_path)

    stem_files = dzi_path.parent / f"{dzi_path.stem}_files"
    if not stem_files.is_dir():
        raise FileNotFoundError("DZI karo klasörü bulunamadı")

    width, height, tile_size, overlap, _fmt = _parse_dzi_xml(dzi_path)
    max_lvl = _disk_max_level(stem_files)
    if max_lvl < 0:
        raise FileNotFoundError("DZI karo klasörü boş veya geçersiz")

    level = _pick_preview_level(stem_files, width, height)
    canvas = _stitch_level_to_image(
        stem_files, level, width, height, tile_size, overlap, max_lvl
    )

    w, h = canvas.size
    target_w = 1024
    if w <= 0 or h <= 0:
        raise ValueError("Geçersiz önizleme boyutu")
    new_w = target_w
    new_h = max(1, int(round(h * (target_w / float(w)))))
    canvas = canvas.resize((new_w, new_h), _lanczos_resample())

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(cache_path, "JPEG", quality=85)
    return str(cache_path)


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


def _opt_metadata_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    t = str(value).strip()
    return t or None


async def ingest_local_file_as_dzi(
    local_source_path: str,
    title: str,
    description: Optional[str],
    specialty: Optional[str],
    db: AsyncSession,
    asset_source: str = "upload",
    stain: Optional[str] = None,
    organ: Optional[str] = None,
    curriculum_track: Optional[str] = None,
    science_unit: Optional[str] = None,
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
        specialty=_opt_metadata_str(specialty),
        stain=_opt_metadata_str(stain),
        organ=_opt_metadata_str(organ),
        curriculum_track=_opt_metadata_str(curriculum_track),
        science_unit=_opt_metadata_str(science_unit),
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


def _walk_has_files(path: str) -> bool:
    if not os.path.isdir(path):
        return False
    for _root, _dirs, files in os.walk(path):
        if files:
            return True
    return False


def _find_dzi_rel_paths(root: str) -> list[str]:
    out: list[str] = []
    for dirpath, _dnames, fnames in os.walk(root):
        for fn in fnames:
            if fn.lower().endswith(".dzi"):
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root).replace("\\", "/")
                out.append(rel)
    return sorted(out)


async def ingest_prebuilt_dzi_bundle(
    abs_dzi_path: str,
    title: str,
    description: Optional[str],
    specialty: Optional[str],
    db: AsyncSession,
    asset_source: str = "upload",
    stain: Optional[str] = None,
    organ: Optional[str] = None,
    curriculum_track: Optional[str] = None,
    science_unit: Optional[str] = None,
) -> HistologyImage:
    """
    Hazır Deep Zoom paketini (.dzi + aynı kökte stem_files/) TILES_DIR altına kopyalar ve DB kaydı oluşturur.
    """
    abs_dzi_path = os.path.realpath(abs_dzi_path)
    if not abs_dzi_path.lower().endswith(".dzi") or not os.path.isfile(abs_dzi_path):
        raise HTTPException(status_code=400, detail="Geçerli bir .dzi dosyası gerekli.")

    stem = abs_dzi_path[:-4]
    files_dir = stem + "_files"
    if not os.path.isdir(files_dir):
        raise HTTPException(
            status_code=400,
            detail=f"DZI karo klasörü eksik: {os.path.basename(files_dir)}",
        )
    if not _walk_has_files(files_dir):
        raise HTTPException(status_code=400, detail="DZI karo klasörü boş.")

    os.makedirs(settings.TILES_DIR, exist_ok=True)
    slug = _slugify(title) or "slide"
    counter = 0
    while True:
        name = slug if counter == 0 else f"{slug}_{counter}"
        dzi_path = os.path.join(settings.TILES_DIR, f"{name}.dzi")
        if not os.path.exists(dzi_path):
            break
        counter += 1

    output_base = os.path.join(settings.TILES_DIR, name)
    loop = asyncio.get_event_loop()

    def _copy_bundle() -> tuple[str, Optional[str]]:
        shutil.copy2(abs_dzi_path, f"{output_base}.dzi")
        dest_files = f"{output_base}_files"
        if os.path.exists(dest_files):
            shutil.rmtree(dest_files)
        shutil.copytree(files_dir, dest_files)
        try:
            subprocess.run(
                ["chmod", "-R", "755", f"{output_base}.dzi"],
                check=False,
            )
            subprocess.run(["chmod", "-R", "755", dest_files], check=False)
        except Exception:
            pass
        thumb_src = f"{stem}_thumb.jpg"
        thumb_url: Optional[str] = None
        if os.path.isfile(thumb_src):
            tdst = f"{output_base}_thumb.jpg"
            shutil.copy2(thumb_src, tdst)
            thumb_url = f"/tiles/{name}_thumb.jpg"
        return f"/tiles/{name}.dzi", thumb_url

    try:
        dzi_url, thumb_url = await loop.run_in_executor(None, _copy_bundle)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DZI kopyalanamadı: {exc}") from exc

    if redis_client:
        await redis_client.delete(CACHE_KEY_LIST)

    image = HistologyImage(
        title=title.strip(),
        description=(description or "").strip() or None,
        image_url=dzi_url,
        thumbnail_url=thumb_url,
        specialty=_opt_metadata_str(specialty),
        stain=_opt_metadata_str(stain),
        organ=_opt_metadata_str(organ),
        curriculum_track=_opt_metadata_str(curriculum_track),
        science_unit=_opt_metadata_str(science_unit),
        asset_source=asset_source,
    )
    try:
        db.add(image)
        await db.commit()
        await db.refresh(image)
        return image
    except Exception as e:
        print(f"DB Kayit Hatasi (DZI bundle): {e}")
        try:
            remove_dzi_bundle(settings.TILES_DIR, dzi_url)
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


@router.get("/images/{image_id}/preview")
async def get_image_preview(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    """DZI paketinden önbellekli 1024px genişlikte JPEG önizleme."""
    result = await db.execute(
        select(HistologyImage).where(HistologyImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")
    if not image.image_url or not str(image.image_url).lower().endswith(".dzi"):
        raise HTTPException(status_code=404, detail="Önizleme yalnızca DZI görüntüleri için")

    loop = asyncio.get_event_loop()
    try:
        path = await loop.run_in_executor(
            None,
            lambda: _ensure_dzi_preview_jpeg(settings.TILES_DIR, image.image_url),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e) or "Dosya bulunamadı") from e
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except OSError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return FileResponse(path, media_type="image/jpeg")


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
    stain: str = Form(""),
    organ: str = Form(""),
    curriculum_track: str = Form(""),
    science_unit: str = Form(""),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """TIFF dosyasını yükle, DZI'ye dönüştür ve veritabanına ekle (sadece admin)."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Yetki gerekli")

    filename_lower = (file.filename or "").lower()
    ext = os.path.splitext(filename_lower)[1]
    convertible = ext in (
        ".tif", ".tiff", ".svs", ".ndpi",
        ".jpg", ".jpeg", ".png", ".gif",
    )
    if not convertible:
        raise HTTPException(
            status_code=400,
            detail="Desteklenmeyen dosya tipi. TIFF/TIF, SVS, NDPI, JPEG, PNG veya GIF yükleyin.",
        )

    suffix = ext or ".tiff"
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
            stain=stain,
            organ=organ,
            curriculum_track=curriculum_track,
            science_unit=science_unit,
        )
    finally:
        try:
            os.unlink(tmp_file.name)
        except OSError:
            pass


@router.post("/images/upload-dzi-bundle", response_model=HistologyImageOut, status_code=201)
async def upload_dzi_bundle(
    bundle_paths: List[str] = Form(...),
    bundle_files: List[UploadFile] = File(...),
    title: str = Form(...),
    description: str = Form(""),
    specialty: str = Form(""),
    stain: str = Form(""),
    organ: str = Form(""),
    curriculum_track: str = Form(""),
    science_unit: str = Form(""),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Hazır Deep Zoom paketi: .dzi ve aynı kökte stem_files/ altındaki karoları tek istekte yükler (admin).
    Tarayıcı klasör seçiminde tüm dosyalar birlikte gönderilir.
    """
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Yetki gerekli")

    if len(bundle_paths) != len(bundle_files):
        raise HTTPException(
            status_code=400,
            detail=f"Yol ve dosya sayısı eşleşmiyor ({len(bundle_paths)} yol, {len(bundle_files)} dosya).",
        )
    if not bundle_paths:
        raise HTTPException(status_code=400, detail="Boş paket.")

    tmp_root = tempfile.mkdtemp(prefix="dzi_bundle_")
    try:
        for rel, up in zip(bundle_paths, bundle_files):
            rel_n = rel.replace("\\", "/").strip().lstrip("/")
            if not rel_n or ".." in rel_n.split("/"):
                raise HTTPException(status_code=400, detail="Geçersiz göreli dosya yolu.")
            dest = os.path.join(tmp_root, rel_n.replace("/", os.sep))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            content = await up.read()
            with open(dest, "wb") as f:
                f.write(content)

        dzis = _find_dzi_rel_paths(tmp_root)
        if len(dzis) != 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Pakette tam olarak bir .dzi olmalı (ve yanında aynı ada sahip _files klasörü). "
                    f"Bulunan: {len(dzis)}"
                ),
            )
        abs_dzi = os.path.join(tmp_root, dzis[0].replace("/", os.sep))
        return await ingest_prebuilt_dzi_bundle(
            abs_dzi,
            title,
            description,
            specialty,
            db,
            asset_source="upload",
            stain=stain,
            organ=organ,
            curriculum_track=curriculum_track,
            science_unit=science_unit,
        )
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)


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
