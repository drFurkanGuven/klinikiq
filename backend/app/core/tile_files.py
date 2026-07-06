"""Sunucudaki /tiles altı DZI paketleri (dzi + _files + _thumb) için dosya yolları."""
from __future__ import annotations

import os
import shutil
from typing import Optional


def remove_dzi_bundle(tiles_dir: str, image_url: Optional[str]) -> None:
    """image_url örn. /tiles/a.dzi veya /tiles/open_histology/a.dzi — ilgili dzi, _files, _thumb siler."""
    if not image_url or not image_url.startswith("/tiles/"):
        return
    rel = image_url[len("/tiles/") :].lstrip("/").replace("\\", "/")
    dzi_path = os.path.join(tiles_dir, rel)
    if os.path.isfile(dzi_path):
        try:
            os.remove(dzi_path)
        except OSError as e:
            print(f"[tiles] dzi silinemedi: {e}")

    dirname, fname = os.path.split(rel)
    stem = os.path.splitext(fname)[0]
    files_rel = os.path.join(dirname, f"{stem}_files") if dirname else f"{stem}_files"
    files_path = os.path.join(tiles_dir, files_rel)
    if os.path.isdir(files_path):
        try:
            shutil.rmtree(files_path)
        except OSError as e:
            print(f"[tiles] _files silinemedi: {e}")

    thumb_rel = os.path.join(dirname, f"{stem}_thumb.jpg") if dirname else f"{stem}_thumb.jpg"
    thumb_path = os.path.join(tiles_dir, thumb_rel)
    if os.path.isfile(thumb_path):
        try:
            os.remove(thumb_path)
        except OSError as e:
            print(f"[tiles] thumb silinemedi: {e}")

    preview_rel = os.path.join(dirname, f"{stem}_preview.jpg") if dirname else f"{stem}_preview.jpg"
    preview_path = os.path.join(tiles_dir, preview_rel)
    if os.path.isfile(preview_path):
        try:
            os.remove(preview_path)
        except OSError as e:
            print(f"[tiles] preview silinemedi: {e}")


def iter_dzi_relative_paths(tiles_dir: str) -> list[str]:
    """TILES_DIR altındaki tüm .dzi dosyalarının göreli yolları (posix)."""
    out: list[str] = []
    if not os.path.isdir(tiles_dir):
        return out
    for root, _, files in os.walk(tiles_dir):
        for f in files:
            if f.lower().endswith(".dzi"):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, tiles_dir).replace("\\", "/")
                out.append(rel)
    return sorted(out)
