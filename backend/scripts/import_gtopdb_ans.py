"""
GtoPdb (IUPHAR/BPS Guide to PHARMACOLOGY) REST API'sinden otonom sinir sistemi
(ANS) reseptör–ligand ilişkilerini çeker ve ham JSON üretir.

Bu ham veri, elle doğrulanmış (curated) `backend/data/pharma/maps/autonomic_ns.json`
haritası için KAYNAK niteliğindedir; uygulama çalışma anında bu ham veriyi kullanmaz.

Lisans: GtoPdb içeriği CC BY-SA 4.0 ile lisanslıdır. Attribution zorunludur.
Kaynak: https://www.guidetopharmacology.org  ·  API: https://www.guidetopharmacology.org/webServices.jsp

Kullanım (proje kökünden):
    python3 backend/scripts/import_gtopdb_ans.py
    python3 backend/scripts/import_gtopdb_ans.py --out backend/data/pharma/raw/ans_interactions.json

Not: Ağ erişimi gerektirir. urllib ile çalışır (ek bağımlılık yok).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_BASE = "https://www.guidetopharmacology.org/services"

# ANS ile ilgili hedef reseptörler (GtoPdb target adları ile eşleşecek anahtar kelimeler)
ANS_RECEPTOR_QUERIES = [
    "adrenoceptor",   # α1, α2, β1, β2, β3
    "muscarinic acetylcholine receptor",  # M1–M5
]

ATTRIBUTION = (
    "IUPHAR/BPS Guide to PHARMACOLOGY (GtoPdb), CC BY-SA 4.0, "
    "https://www.guidetopharmacology.org"
)

DEFAULT_OUT = Path("backend/data/pharma/raw/ans_interactions.json")


def _get_json(url: str, retries: int = 3, timeout: int = 30):
    """Basit GET + JSON. GtoPdb bazen yavaş; retry ile toleranslı."""
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "KlinikIQ-ANS-Importer/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            last_err = exc
            print(f"  ! deneme {attempt}/{retries} başarısız: {exc}", file=sys.stderr)
            time.sleep(2 * attempt)
    raise RuntimeError(f"İstek başarısız: {url} ({last_err})")


def fetch_targets() -> list[dict]:
    """Tüm reseptör hedeflerini çekip ANS ile ilgili olanları filtreler."""
    print("→ Hedef (target) listesi çekiliyor…")
    targets = _get_json(f"{API_BASE}/targets?type=GPCR")
    selected: list[dict] = []
    for t in targets:
        name = (t.get("name") or "").lower()
        if any(q in name for q in ANS_RECEPTOR_QUERIES):
            selected.append(t)
    print(f"  {len(selected)} ANS reseptör hedefi seçildi.")
    return selected


def fetch_interactions(target_id: int) -> list[dict]:
    """Bir hedefe ait ligand etkileşimlerini çeker."""
    try:
        return _get_json(f"{API_BASE}/targets/{target_id}/interactions")
    except RuntimeError as exc:
        print(f"  ! target {target_id} etkileşimleri alınamadı: {exc}", file=sys.stderr)
        return []


def build_dataset() -> dict:
    targets = fetch_targets()
    records: list[dict] = []
    for t in targets:
        tid = t.get("targetId")
        tname = t.get("name")
        if tid is None:
            continue
        print(f"→ {tname} (#{tid}) etkileşimleri…")
        interactions = fetch_interactions(int(tid))
        for it in interactions:
            records.append(
                {
                    "target_id": tid,
                    "target_name": tname,
                    "ligand_id": it.get("ligandId"),
                    "ligand_name": it.get("ligandName") or it.get("ligand"),
                    "action": it.get("action"),          # Agonist / Antagonist …
                    "type": it.get("type"),              # Agonist / Antagonist / Inhibitor …
                    "affinity": it.get("affinity"),
                    "affinity_type": it.get("affinityParameter"),
                    "primary_target": it.get("primaryTarget"),
                }
            )
        time.sleep(0.5)  # API'ye nazik ol

    return {
        "_meta": {
            "source": "GtoPdb REST API",
            "attribution": ATTRIBUTION,
            "license": "CC BY-SA 4.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "note": "Ham kaynak veri; curated autonomic_ns.json için referanstır.",
        },
        "targets": [{"target_id": t.get("targetId"), "name": t.get("name")} for t in targets],
        "interactions": records,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="GtoPdb ANS reseptör-ligand etkileşimlerini indir.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Çıktı JSON yolu")
    args = parser.parse_args()

    try:
        dataset = build_dataset()
    except RuntimeError as exc:
        print(f"HATA: {exc}", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    print(f"\n✓ {len(dataset['interactions'])} etkileşim yazıldı → {args.out}")
    print("  Attribution:", ATTRIBUTION)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
