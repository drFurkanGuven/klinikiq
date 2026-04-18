#!/usr/bin/env python3
"""
unified_emergency.jsonl içindeki mcq_four kayıtlarına Türkçe alan ekler.

Çıktı alanları (kaynak satıra eklenir):
  - question_tr: str
  - options_tr: [ { "label": "A"|"B"|"C"|"D", "text": "..." }, ... ]  (İngilizce options ile aynı sıra/etiket)
  - translation_meta: { "model", "translated_at" (ISO), "source_lang": "en" }

Kullanım:
  cd backend/scripts/medical_qa_dataset
  pip install -r requirements.txt
  export OPENAI_API_KEY=...
  python translate_emergency_mcq.py --in ../../data/medical_qa/emergency/unified_emergency.jsonl --out ../../data/medical_qa/emergency/unified_emergency_tr.jsonl --limit 3

Tüm havuz (uzun sürer, maliyetli):
  python translate_emergency_mcq.py --in ... --out ...

Özgeçmiş: question_tr zaten varsa satır atlanır (--force ile yeniden çevir).

Backend: GET /api/emergency-mcq/random?lang=tr (çeviri yoksa otomatik İngilizce gösterilir).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from openai import OpenAI
except ImportError:
    print("openai paketi gerekli: pip install openai", file=sys.stderr)
    sys.exit(1)

MODEL_DEFAULT = "gpt-4o-mini"


SYSTEM_PROMPT = """Sen tıp eğitimi için İngilizce USMLE tarzı çoktan seçmeli soruları Türkçeye çeviriyorsun.
KURALLAR:
- Çıktı YALNIZCA istenen JSON nesnesi; başka metin yok.
- Soru kökünü ve dört şıkkı akıcı, profesyonel Türkçe ile çevir.
- Tıbbi kısaltmaları (ECG, STEMI, CPR, IV, IM, PE, DVT vb.) gerektiğinde koruyabilir veya yaygın Türkçe karşılığıyla yaz.
- Şık harfleri A, B, C, D aynı kalmalı; şık anlamı korunmalı (çeviri sonrası doğru şık yine aynı harf olmalı).
- PubMed/İngilizce dilbilgisi hatalarını düzelt; içeriği değiştirme (yeni tanı uydurma)."""


def _build_user_payload(item: dict[str, Any]) -> str:
    q = str(item.get("question") or "")
    opts = item.get("options") or []
    lines = []
    if isinstance(opts, list):
        for o in opts:
            if isinstance(o, dict):
                lines.append(f'{o.get("label")}) {o.get("text")}')
    return f"""Aşağıdaki metni çevir ve JSON ver.

SORU (İngilizce):
{q}

ŞIKLAR:
{chr(10).join(lines)}

JSON şeması (tam olarak):
{{
  "question_tr": "Türkçe soru metni",
  "options_tr": [
    {{ "label": "A", "text": "..." }},
    {{ "label": "B", "text": "..." }},
    {{ "label": "C", "text": "..." }},
    {{ "label": "D", "text": "..." }}
  ]
}}"""


def _validate_options_tr(
    orig: list[dict[str, Any]], tr: list[dict[str, Any]]
) -> bool:
    if len(orig) != len(tr):
        return False
    for a, b in zip(orig, tr):
        la = str(a.get("label", "")).strip().upper()
        lb = str(b.get("label", "")).strip().upper()
        if la != lb:
            return False
        if not str(b.get("text", "")).strip():
            return False
    return True


def translate_one(
    client: OpenAI,
    item: dict[str, Any],
    model: str,
) -> dict[str, Any]:
    """item kopyasına question_tr, options_tr, translation_meta ekler."""
    out = dict(item)
    resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        max_tokens=2500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_payload(item)},
        ],
    )
    raw = (resp.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) >= 2 else raw
        if raw.lstrip().startswith("json"):
            raw = raw.lstrip()[4:].lstrip()
    data = json.loads(raw)
    q_tr = str(data.get("question_tr") or "").strip()
    opt_tr = data.get("options_tr")
    orig_opts = item.get("options") or []
    if not q_tr or not isinstance(opt_tr, list):
        raise ValueError("model çıktısı eksik")
    if not _validate_options_tr(orig_opts if isinstance(orig_opts, list) else [], opt_tr):
        raise ValueError("şık etiketleri veya uzunluk uyuşmuyor")
    out["question_tr"] = q_tr
    out["options_tr"] = opt_tr
    out["translation_meta"] = {
        "model": model,
        "translated_at": datetime.now(timezone.utc).isoformat(),
        "source_lang": "en",
    }
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Acil MCQ JSONL Türkçe çeviri")
    ap.add_argument(
        "--in",
        dest="in_path",
        required=True,
        help="Girdi unified_emergency.jsonl",
    )
    ap.add_argument(
        "--out",
        dest="out_path",
        required=True,
        help="Çıktı JSONL (genelde yeni dosya önerilir)",
    )
    ap.add_argument("--model", default=MODEL_DEFAULT, help="OpenAI model adı")
    ap.add_argument(
        "--limit",
        type=int,
        default=0,
        help="En fazla bu kadar satır çevir (0=tümü, test için 3–5 kullanın)",
    )
    ap.add_argument(
        "--sleep",
        type=float,
        default=0.25,
        help="İstekler arası saniye (rate limit)",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="question_tr varsa bile yeniden çevir",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="API çağrısı yapma; kaç satır işleneceğini yaz",
    )
    args = ap.parse_args()

    in_path = Path(args.in_path).resolve()
    out_path = Path(args.out_path).resolve()
    if not in_path.is_file():
        print(f"Dosya yok: {in_path}", file=sys.stderr)
        sys.exit(1)

    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not args.dry_run and (not api_key or api_key.startswith("sk-placeholder")):
        print("OPENAI_API_KEY tanımlı değil.", file=sys.stderr)
        sys.exit(1)

    lines_in: list[str] = []
    with in_path.open(encoding="utf-8") as f:
        for line in f:
            s = line.rstrip("\n")
            if s.strip():
                lines_in.append(s)

    need_translate: list[tuple[int, dict[str, Any]]] = []
    for i, line in enumerate(lines_in):
        obj = json.loads(line)
        if obj.get("question_type") != "mcq_four":
            continue
        if (obj.get("question_tr") or "").strip() and not args.force:
            continue
        need_translate.append((i, obj))

    if args.limit and args.limit > 0:
        need_translate = need_translate[: args.limit]

    if args.dry_run:
        n_mcq = sum(1 for ln in lines_in if json.loads(ln).get("question_type") == "mcq_four")
        print(f"Toplam satır: {len(lines_in)} (mcq_four: {n_mcq})")
        print(f"Çevrilecek: {len(need_translate)}")
        sys.exit(0)

    client = OpenAI(api_key=api_key)
    out_lines = lines_in[:]

    for idx, (line_idx, item) in enumerate(need_translate):
        try:
            new_item = translate_one(client, item, args.model)
            out_lines[line_idx] = json.dumps(new_item, ensure_ascii=False)
            print(f"[{idx + 1}/{len(need_translate)}] ok id={item.get('id')}")
        except Exception as e:
            print(f"HATA id={item.get('id')}: {e}", file=sys.stderr)
        time.sleep(args.sleep)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for ln in out_lines:
            f.write(ln + "\n")

    print(f"Yazıldı: {out_path}")


if __name__ == "__main__":
    main()
