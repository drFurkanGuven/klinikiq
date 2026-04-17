#!/usr/bin/env python3
"""
Örnek: Hugging Face'ten tek bir WSI dosyası indirip veritabanına kaydeder (uvicorn/backend ortamında).

  cd backend
  export DATABASE_URL=postgresql+asyncpg://...
  export HF_TOKEN=...   # opsiyonel, kapalı veri kümeleri için
  python scripts/hf_import_tiff_cli.py \\
    --repo-id org/dataset \\
    --path slides/sample.svs \\
    --title "Örnek vaka"

Gerçek üretimde POST /api/admin/hf/import-tiff kullanmanız önerilir.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--path", dest="path_in_repo", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--repo-type", default="dataset", choices=("dataset", "model"))
    args = parser.parse_args()

    from huggingface_hub import hf_hub_download

    from app.core.config import settings
    from app.core.database import AsyncSessionLocal
    from app.api.microscope import ingest_local_file_as_dzi

    local = hf_hub_download(
        repo_id=args.repo_id,
        filename=args.path_in_repo,
        repo_type=args.repo_type,
        token=settings.HF_TOKEN or None,
    )

    async with AsyncSessionLocal() as db:
        img = await ingest_local_file_as_dzi(
            local,
            args.title,
            None,
            None,
            db,
            asset_source="huggingface",
        )
        print("OK:", img.id, img.image_url)


if __name__ == "__main__":
    asyncio.run(main())
