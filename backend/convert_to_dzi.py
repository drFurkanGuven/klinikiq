"""
TIFF → DZI Dönüşüm Scripti
Kullanım:
  python convert_to_dzi.py --repo histai/HISTAI-kidney --file case_001/slide_HE_1.tiff --name kidney_normal

DZI çıktısı /tiles/{name}.dzi + /tiles/{name}_files/ dizinine kaydedilir.
Veritabanına otomatik eklenir.
"""
import argparse
import asyncio
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def convert_tiff_to_dzi(tiff_path: str, output_name: str, tiles_dir: str = "/tiles") -> str:
    """TIFF dosyasını DZI formatına dönüştürür (vips CLI). DZI URL'ini döndürür."""
    import shutil
    import subprocess

    if not shutil.which("vips"):
        raise RuntimeError("vips bulunamadı. 'apt-get install libvips-tools' ile kur.")

    os.makedirs(tiles_dir, exist_ok=True)
    output_base = os.path.join(tiles_dir, output_name)

    print(f"  Dönüştürülüyor: {tiff_path} → {output_base}.dzi")

    result = subprocess.run(
        [
            "vips", "dzsave", tiff_path, output_base,
            "--tile-size", "256",
            "--overlap", "1",
            "--suffix", ".jpg[Q=85]",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"vips dzsave başarısız:\n{result.stderr}")

    print(f"  Tamamlandı: {output_base}.dzi")
    return f"/tiles/{output_name}.dzi"


async def add_to_db(name: str, title: str, description: str, specialty: str, dzi_url: str):
    from app.core.database import AsyncSessionLocal
    from app.models.models import HistologyImage
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(HistologyImage).where(HistologyImage.image_url == dzi_url)
        )
        if result.scalar_one_or_none():
            print(f"  Zaten mevcut: {dzi_url}")
            return

        img = HistologyImage(
            title=title,
            description=description,
            image_url=dzi_url,
            specialty=specialty,
        )
        db.add(img)
        await db.commit()
        print(f"  Veritabanına eklendi: {title}")


def download_from_hf(repo_id: str, filename: str) -> str:
    """Hugging Face'den dosya indir, geçici dosya yolu döndür."""
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        raise RuntimeError("huggingface_hub kurulu değil: pip install huggingface_hub")

    print(f"  HuggingFace'den indiriliyor: {repo_id}/{filename}")
    path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        repo_type="dataset",
        local_dir=tempfile.mkdtemp(prefix="klinikiq_tiff_"),
    )
    print(f"  İndirildi: {path}")
    return path


def main():
    parser = argparse.ArgumentParser(description="TIFF → DZI dönüşüm ve DB kaydı")
    subparsers = parser.add_subparsers(dest="command")

    # Yerel dosyadan dönüştür
    local = subparsers.add_parser("local", help="Yerel TIFF dosyasını dönüştür")
    local.add_argument("--file", required=True, help="Yerel TIFF dosya yolu")
    local.add_argument("--name", required=True, help="Çıktı ismi (ör: kidney_normal)")
    local.add_argument("--title", required=True, help="Görüntü başlığı")
    local.add_argument("--description", default="", help="Açıklama")
    local.add_argument("--specialty", default="nephrology", help="Branş")

    # HuggingFace'den indir + dönüştür
    hf = subparsers.add_parser("hf", help="HuggingFace'den indir ve dönüştür")
    hf.add_argument("--repo", required=True, help="HF repo ID (ör: histai/HISTAI-kidney)")
    hf.add_argument("--file", required=True, help="Repo içi dosya yolu")
    hf.add_argument("--name", required=True, help="Çıktı ismi")
    hf.add_argument("--title", required=True, help="Görüntü başlığı")
    hf.add_argument("--description", default="", help="Açıklama")
    hf.add_argument("--specialty", default="nephrology", help="Branş")

    args = parser.parse_args()

    if args.command == "local":
        dzi_url = convert_tiff_to_dzi(args.file, args.name)
        asyncio.run(add_to_db(args.name, args.title, args.description, args.specialty, dzi_url))

    elif args.command == "hf":
        tiff_path = download_from_hf(args.repo, args.file)
        dzi_url = convert_tiff_to_dzi(tiff_path, args.name)
        asyncio.run(add_to_db(args.name, args.title, args.description, args.specialty, dzi_url))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
