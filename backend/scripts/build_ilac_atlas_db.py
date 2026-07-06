#!/usr/bin/env python3
"""
Tıp Atlası ilaclardb PHPMyAdmin export → SQLite (barkod ile hızlı sorgu).

Kaynak: ilac.json (PHPMyAdmin JSON plugin) — ilac.sql ile aynı `ilac` tablosu;
SQL dosyası için önce MySQL/MariaDB’e import edip JSON export alın veya bu scripti
yalnızca ilac.json ile çalıştırın.

Kullanım (repo kökünden):
  python backend/scripts/build_ilac_atlas_db.py
  python backend/scripts/build_ilac_atlas_db.py /path/to/ilac.json

Çıktı: backend/data/ilac_atlas.db
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def find_table_rows(payload: list) -> list[dict]:
    for item in payload:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "table" and item.get("name") == "ilac" and "data" in item:
            return item["data"]
    raise ValueError("JSON içinde type=table, name=ilac bulunamadı.")


def norm_barcode(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    if s.endswith(".0") and s[:-2].isdigit():
        s = s[:-2]
    return s if s.isdigit() else s


def main() -> None:
    root = repo_root()
    src = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "ilac.json"
    out_dir = root / "backend" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_db = out_dir / "ilac_atlas.db"

    if not src.is_file():
        print(f"Dosya yok: {src}", file=sys.stderr)
        sys.exit(1)

    print(f"Okunuyor: {src} (bu biraz sürebilir)...")
    with open(src, encoding="utf-8") as f:
        payload = json.load(f)

    rows = find_table_rows(payload)
    print(f"Kayıt sayısı: {len(rows)}")

    if out_db.exists():
        out_db.unlink()

    conn = sqlite3.connect(out_db)
    conn.execute(
        """
        CREATE TABLE ilac_atlas (
            id INTEGER PRIMARY KEY,
            barcode TEXT NOT NULL UNIQUE,
            atc_code TEXT,
            active_ingredient TEXT,
            product_name TEXT,
            category_1 TEXT,
            category_2 TEXT,
            category_3 TEXT,
            category_4 TEXT,
            category_5 TEXT,
            description TEXT
        )
        """
    )
    conn.execute("CREATE INDEX idx_ilac_atlas_barcode ON ilac_atlas(barcode)")

    inserted = 0
    for r in rows:
        if not isinstance(r, dict):
            continue
        bc = norm_barcode(r.get("barcode"))
        if not bc:
            continue
        try:
            rid = int(str(r.get("ID", "0")).split(".")[0])
        except ValueError:
            rid = None
        conn.execute(
            """
            INSERT OR REPLACE INTO ilac_atlas
            (id, barcode, atc_code, active_ingredient, product_name,
             category_1, category_2, category_3, category_4, category_5, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rid,
                bc,
                (r.get("ATC_code") or None) and str(r.get("ATC_code")).strip() or None,
                (r.get("Active_Ingredient") or None) and str(r.get("Active_Ingredient")).strip() or None,
                (r.get("Product_Name") or None) and str(r.get("Product_Name")).strip() or None,
                (r.get("Category_1") or None) and str(r.get("Category_1")).strip() or None,
                (r.get("Category_2") or None) and str(r.get("Category_2")).strip() or None,
                (r.get("Category_3") or None) and str(r.get("Category_3")).strip() or None,
                (r.get("Category_4") or None) and str(r.get("Category_4")).strip() or None,
                (r.get("Category_5") or None) and str(r.get("Category_5")).strip() or None,
                (r.get("Description") or None) and str(r.get("Description")) or None,
            ),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"SQLite yazıldı: {out_db} ({inserted} kayıt)")


if __name__ == "__main__":
    main()
