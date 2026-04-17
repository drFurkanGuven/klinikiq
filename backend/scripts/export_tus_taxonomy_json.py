#!/usr/bin/env python3
"""
frontend/lib/tus-taxonomy.ts → backend/app/data/tus_taxonomy.json

Proje kökünden: python3 backend/scripts/export_tus_taxonomy_json.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TS_PATH = ROOT / "frontend" / "lib" / "tus-taxonomy.ts"
OUT_PATH = ROOT / "backend" / "app" / "data" / "tus_taxonomy.json"


def extract_const_block(text: str, name: str) -> str:
    m = re.search(
        rf"export const {re.escape(name)}: TusBranch\[\] = (\[[\s\S]*?\n\]);",
        text,
    )
    if not m:
        raise SystemExit(f"Bulunamadı: {name}")
    return m.group(1)


def parse_branch_topics(block: str) -> dict[str, list[str]]:
    """Branch id → topic id listesi (topics: [ ... ] içindeki tüm id: alanları)."""
    out: dict[str, list[str]] = {}
    i = 0
    while i < len(block):
        m = re.search(r'\bid:\s*"([^"]+)"', block[i:])
        if not m:
            break
        branch_id = m.group(1)
        rest = block[i + m.start() :]
        topics_m = re.search(r"topics:\s*\[", rest)
        if not topics_m:
            i += m.end()
            continue
        start = i + m.start() + topics_m.end()
        depth = 1
        j = start
        while j < len(block) and depth > 0:
            if block[j] == "[":
                depth += 1
            elif block[j] == "]":
                depth -= 1
            j += 1
        topics_body = block[start : j - 1]
        tids = re.findall(r'\bid:\s*"([^"]+)"', topics_body)
        out[branch_id] = tids
        i = j
    return out


def main() -> None:
    text = TS_PATH.read_text(encoding="utf-8")
    temel = parse_branch_topics(extract_const_block(text, "TUS_TEMEL_BRANCHES"))
    klinik = parse_branch_topics(extract_const_block(text, "TUS_KLINIK_BRANCHES"))
    payload = {"version": 1, "groups": {"temel": temel, "klinik": klinik}}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Yazıldı: {OUT_PATH} (temel {len(temel)} dal, klinik {len(klinik)} dal)")


if __name__ == "__main__":
    main()
