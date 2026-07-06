"""MCQ havuz yükleme — acil TR ve USMLE pratik."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import HTTPException

_POOL_EMERGENCY: list[dict[str, Any]] | None = None
_BY_ID_EMERGENCY: dict[str, dict[str, Any]] | None = None
_POOL_EMERGENCY_TR: list[dict[str, Any]] | None = None
_BY_ID_EMERGENCY_TR: dict[str, dict[str, Any]] | None = None

_POOL_USMLE: list[dict[str, Any]] | None = None
_BY_ID_USMLE: dict[str, dict[str, Any]] | None = None


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def emergency_jsonl_path() -> Path:
    raw = (os.environ.get("MEDICAL_QA_EMERGENCY_JSONL") or "").strip()
    if raw:
        p = Path(raw)
        return p if p.is_absolute() else (_backend_root() / p).resolve()
    return (_backend_root() / "data" / "medical_qa" / "emergency" / "unified_emergency.jsonl").resolve()


def _has_tr_translation(item: dict[str, Any]) -> bool:
    if not str(item.get("question_tr") or "").strip():
        return False
    tr_opts = item.get("options_tr")
    return isinstance(tr_opts, list) and len(tr_opts) > 0


def load_emergency_pool(*, tr_only: bool = False) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    global _POOL_EMERGENCY, _BY_ID_EMERGENCY, _POOL_EMERGENCY_TR, _BY_ID_EMERGENCY_TR
    if tr_only and _POOL_EMERGENCY_TR is not None and _BY_ID_EMERGENCY_TR is not None:
        return _POOL_EMERGENCY_TR, _BY_ID_EMERGENCY_TR
    if not tr_only and _POOL_EMERGENCY is not None and _BY_ID_EMERGENCY is not None:
        return _POOL_EMERGENCY, _BY_ID_EMERGENCY

    path = emergency_jsonl_path()
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Acil soru verisi yok: {path}",
        )
    pool: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj.get("question_type") != "mcq_four":
                continue
            oid = str(obj.get("id") or "")
            if not oid:
                continue
            if tr_only and not _has_tr_translation(obj):
                continue
            pool.append(obj)
            by_id[oid] = obj
    if not pool:
        detail = "Acil veri dosyasında Türkçe mcq_four sorusu yok." if tr_only else "Acil veri dosyasında mcq_four sorusu yok."
        raise HTTPException(status_code=503, detail=detail)

    if tr_only:
        _POOL_EMERGENCY_TR = pool
        _BY_ID_EMERGENCY_TR = by_id
    else:
        _POOL_EMERGENCY = pool
        _BY_ID_EMERGENCY = by_id
    return pool, by_id


def _practice_jsonl_paths() -> tuple[Path, Path]:
    raw = (os.environ.get("MEDICAL_QA_PRACTICE_JSONL_DIR") or "").strip()
    if raw:
        d = Path(raw)
        base = d if d.is_absolute() else (_backend_root() / d).resolve()
    else:
        base = _backend_root() / "data" / "medical_qa" / "raw"
    return (base / "medqa_usmle_train.jsonl", base / "medqa_usmle_test.jsonl")


def _emergency_ids_path() -> Path:
    return _backend_root() / "data" / "medical_qa" / "emergency" / "medqa_usmle_emergency.jsonl"


def _load_emergency_ids() -> set[str]:
    path = _emergency_ids_path()
    out: set[str] = set()
    if not path.is_file():
        return out
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                oid = str(obj.get("id") or "").strip()
                if oid:
                    out.add(oid)
            except json.JSONDecodeError:
                continue
    return out


def load_usmle_pool() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    global _POOL_USMLE, _BY_ID_USMLE
    if _POOL_USMLE is not None and _BY_ID_USMLE is not None:
        return _POOL_USMLE, _BY_ID_USMLE

    train_p, test_p = _practice_jsonl_paths()
    if not train_p.is_file() or not test_p.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"MedQA USMLE JSONL bulunamadı: train={train_p} test={test_p}",
        )
    emergency_ids = _load_emergency_ids()
    pool: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    for path in (train_p, test_p):
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                if obj.get("question_type") != "mcq_four":
                    continue
                oid = str(obj.get("id") or "").strip()
                if not oid or oid in emergency_ids:
                    continue
                pool.append(obj)
                by_id[oid] = obj
    if not pool:
        raise HTTPException(status_code=503, detail="USMLE pratik havuzu boş.")
    _POOL_USMLE = pool
    _BY_ID_USMLE = by_id
    return pool, by_id


def get_pool_item(pool: str, mcq_id: str) -> dict[str, Any] | None:
    if pool == "emergency_tr":
        _, by_id = load_emergency_pool(tr_only=True)
    elif pool == "practice_usmle":
        _, by_id = load_usmle_pool()
    else:
        return None
    return by_id.get(mcq_id)


def mcq_question_display(item: dict[str, Any], lang: str) -> str:
    l = (lang or "en").lower()
    if l.startswith("tr") and str(item.get("question_tr") or "").strip():
        return str(item["question_tr"])
    return str(item.get("question") or "")


def mcq_options_display(item: dict[str, Any], lang: str) -> list[dict[str, Any]]:
    l = (lang or "en").lower()
    tr = item.get("options_tr")
    if l.startswith("tr") and isinstance(tr, list) and len(tr) > 0:
        return tr
    raw = item.get("options") or []
    return raw if isinstance(raw, list) else []


def verify_mcq_answer(item: dict[str, Any], selected_label: str) -> tuple[bool, str | None, str | None]:
    correct_label = str(item.get("correct_option_label") or "").strip().upper()
    sel = selected_label.strip().upper()
    if sel and len(sel) > 0:
        sel = sel[0]
    ok = bool(correct_label) and sel == correct_label
    return ok, correct_label or None, str(item.get("correct_answer_text") or "") or None
