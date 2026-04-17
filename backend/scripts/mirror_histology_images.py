#!/usr/bin/env python3
"""
Wikimedia (veya HTTP) görüntülerini sunucudaki ./tiles/open_histology/ altına indirir;
PostgreSQL için güncellenmiş image_url/thumbnail_url satırlarını üretmek üzere manifest yazar.

Kullanım (proje kökünden):
  cd backend && python scripts/mirror_histology_images.py

Çıktı: backend/tiles_manifest_open_histology.json
Sunucuda: docker volume ./tiles ile aynı dizine kopyalayın; nginx /tiles/ üzerinden servis edilir.

Not: Telif için yalnızca açık lisanslı kaynakları ve Commons kullanım şartlarına uyun.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import urllib.request

# seed_histology ile aynı kaynak listesi — tekrar tanımlamamak için import dene
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_ROOT)

try:
    from seed_histology import BASIC_CURRICULUM_IMAGES, commons_thumb
except ImportError:
    print("seed_histology içe aktarılamadı; backend/ dizininden çalıştırın.", file=sys.stderr)
    sys.exit(1)

TILES_SUBDIR = "open_histology"
OUT_JSON = os.path.join(BACKEND_ROOT, "tiles_manifest_open_histology.json")


def _slug(title: str, url: str) -> str:
    base = re.sub(r"[^\w]+", "_", title.lower(), flags=re.ASCII)[:50].strip("_")
    if not base:
        base = "img"
    h = hashlib.sha256(url.encode()).hexdigest()[:10]
    return f"{base}_{h}"


def main() -> None:
    tiles_root = os.environ.get("TILES_DIR", os.path.join(BACKEND_ROOT, "..", "tiles"))
    tiles_root = os.path.abspath(tiles_root)
    target_dir = os.path.join(tiles_root, TILES_SUBDIR)
    os.makedirs(target_dir, mode=0o755, exist_ok=True)

    manifest: list[dict] = []
    ua = {"User-Agent": "KlinikiqMirror/1.0 (educational; +https://github.com/drFurkanGuven/klinikiq)"}

    for row in BASIC_CURRICULUM_IMAGES:
        url = row["image_url"]
        slug = _slug(row["title"], url)
        ext = ".jpg"
        if url.lower().rstrip("/").endswith(".png"):
            ext = ".png"
        local_name = f"{slug}{ext}"
        dest = os.path.join(target_dir, local_name)

        if not os.path.exists(dest):
            req = urllib.request.Request(url, headers=ua)
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            with open(dest, "wb") as f:
                f.write(data)
            print(f"OK {local_name} ({len(data)} bytes)")
        else:
            print(f"SKIP (exists) {local_name}")

        public_path = f"/tiles/{TILES_SUBDIR}/{local_name}"
        thumb_path = public_path  # aynı dosya; istenirse vips thumbnail eklenebilir
        manifest.append(
            {
                "title": row["title"],
                "image_url": public_path,
                "thumbnail_url": thumb_path,
                "original_url": url,
                "commons_thumb_was": commons_thumb(url),
                **{k: row[k] for k in ("description", "specialty", "stain", "organ", "curriculum_track", "science_unit") if k in row},
            }
        )

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nManifest: {OUT_JSON}")
    print("Veritabanında image_url alanlarını bu manifestteki public_path ile güncelleyin veya seed'i özelleştirin.")


if __name__ == "__main__":
    main()
