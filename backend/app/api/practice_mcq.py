"""
MedQA USMLE pratik MCQ (train+test JSONL, acil hariç).
Veri: backend/data/medical_qa/raw — DB yok.
"""

from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import get_current_user_id

router = APIRouter()

_POOL: list[dict[str, Any]] | None = None
_BY_ID: dict[str, dict[str, Any]] | None = None

SPECIALTY_MAP: dict[str, list[str]] = {
    "cardiology": [
        "cardiac",
        "heart",
        "myocardial",
        "arrhythmia",
        "ecg",
        "coronary",
        "atrial",
        "ventricular",
        "aortic",
        "pericarditis",
        "endocarditis",
    ],
    "pulmonology": [
        "pulmonary",
        "lung",
        "pneumonia",
        "asthma",
        "copd",
        "respiratory",
        "bronchial",
        "pleural",
        "tuberculosis",
        "dyspnea",
        "emphysema",
    ],
    "nephrology": [
        "renal",
        "kidney",
        "creatinine",
        "glomerular",
        "nephrotic",
        "dialysis",
        "uremia",
        "proteinuria",
        "hematuria",
        "electrolyte",
    ],
    "gastroenterology": [
        "liver",
        "hepatic",
        "bowel",
        "colon",
        "crohn",
        "colitis",
        "pancreas",
        "gastric",
        "esophageal",
        "cirrhosis",
        "hepatitis",
        "ileum",
    ],
    "neurology": [
        "stroke",
        "seizure",
        "neurological",
        "brain",
        "cerebral",
        "parkinson",
        "alzheimer",
        "meningitis",
        "neuropathy",
        "multiple sclerosis",
    ],
    "endocrinology": [
        "diabetes",
        "thyroid",
        "adrenal",
        "insulin",
        "hypoglycemia",
        "hypothyroidism",
        "hyperthyroidism",
        "cortisol",
        "pituitary",
    ],
    "hematology": [
        "anemia",
        "leukemia",
        "lymphoma",
        "platelet",
        "coagulation",
        "sickle",
        "thrombocytopenia",
        "hemoglobin",
        "bone marrow",
    ],
    "infectious_disease": [
        "infection",
        "bacterial",
        "viral",
        "antibiotic",
        "sepsis",
        "hiv",
        "fever",
        "fungal",
        "parasit",
        "malaria",
        "tuberculosis",
    ],
    "psychiatry": [
        "depression",
        "anxiety",
        "schizophrenia",
        "bipolar",
        "psychiatric",
        "psychosis",
        "dementia",
        "suicide",
        "mania",
        "phobia",
    ],
    "rheumatology": [
        "arthritis",
        "lupus",
        "rheumatoid",
        "autoimmune",
        "joint",
        "inflammatory",
        "sjogren",
        "vasculitis",
        "fibromyalgia",
    ],
    "obstetrics": [
        "pregnant",
        "pregnancy",
        "fetal",
        "uterine",
        "ovarian",
        "cervical",
        "menstrual",
        "gestational",
        "labor",
        "postpartum",
    ],
    "pediatrics": [
        "child",
        "infant",
        "newborn",
        "pediatric",
        "congenital",
        "neonatal",
    ],
    "oncology": [
        "cancer",
        "tumor",
        "malignant",
        "metastasis",
        "chemotherapy",
        "carcinoma",
        "lymphoma",
        "biopsy",
        "radiation",
    ],
}


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


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


def _detect_specialty(obj: dict[str, Any]) -> str:
    parts: list[str] = [str(obj.get("question") or "")]
    opts = obj.get("options")
    if isinstance(opts, list):
        for o in opts:
            if isinstance(o, dict) and o.get("text") is not None:
                parts.append(str(o["text"]))
    blob = " ".join(parts).lower()
    for spec, kws in SPECIALTY_MAP.items():
        for kw in kws:
            if kw.lower() in blob:
                return spec
    return "other"


def _practice_meta_info(obj: dict[str, Any]) -> str:
    m = obj.get("meta")
    if isinstance(m, dict):
        v = m.get("meta_info")
        if v in ("step1", "step2&3"):
            return str(v)
    return "other"


def _load_pool() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    global _POOL, _BY_ID
    if _POOL is not None and _BY_ID is not None:
        return _POOL, _BY_ID

    train_p, test_p = _practice_jsonl_paths()
    if not train_p.is_file() or not test_p.is_file():
        raise HTTPException(
            status_code=503,
            detail=(
                f"MedQA USMLE JSONL bulunamadı: "
                f"train={train_p} test={test_p}. "
                f"MEDICAL_QA_PRACTICE_JSONL_DIR veya data/medical_qa/raw yolunu kontrol edin."
            ),
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
                enriched = dict(obj)
                enriched["practice_specialty"] = _detect_specialty(enriched)
                enriched["practice_meta_info"] = _practice_meta_info(enriched)
                pool.append(enriched)
                by_id[oid] = enriched

    if not pool:
        raise HTTPException(
            status_code=503,
            detail="USMLE pratik havuzunda mcq_four sorusu kalmadı (dosya boş veya tümü acil filtresinde).",
        )

    _POOL = pool
    _BY_ID = by_id
    return _POOL, _BY_ID


class PracticeMcqOptionOut(BaseModel):
    label: str
    text: str


class PracticeMcqOut(BaseModel):
    id: str
    question: str
    options: list[PracticeMcqOptionOut]
    source: str
    meta_info: str
    specialty: str


class PracticeMcqStatsOut(BaseModel):
    total: int
    by_specialty: dict[str, int]
    by_step: dict[str, int]


class PracticeMcqVerifyIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=512)
    selected_label: str = Field(..., min_length=1, max_length=8)


class PracticeMcqVerifyOut(BaseModel):
    correct: bool
    correct_label: str
    correct_answer_text: str


def _item_to_out(item: dict[str, Any]) -> PracticeMcqOut:
    raw_opts = item.get("options") or []
    options_out: list[PracticeMcqOptionOut] = []
    if isinstance(raw_opts, list):
        for o in raw_opts:
            if isinstance(o, dict) and o.get("label") is not None and o.get("text") is not None:
                options_out.append(
                    PracticeMcqOptionOut(label=str(o["label"]).strip(), text=str(o["text"]))
                )
    return PracticeMcqOut(
        id=str(item["id"]),
        question=str(item.get("question") or ""),
        options=options_out,
        source=str(item.get("source") or "medqa_usmle"),
        meta_info=str(item.get("practice_meta_info") or "other"),
        specialty=str(item.get("practice_specialty") or "other"),
    )


def _filter_pool(
    pool: list[dict[str, Any]],
    specialty: str | None,
    step: str | None,
) -> list[dict[str, Any]]:
    out = pool
    if specialty:
        s = specialty.strip().lower()
        out = [x for x in out if str(x.get("practice_specialty") or "") == s]
    if step:
        st = step.strip()
        if st in ("step1", "step2&3"):
            out = [x for x in out if str(x.get("practice_meta_info") or "") == st]
    return out


@router.get("/stats", response_model=PracticeMcqStatsOut)
async def practice_mcq_stats(_user_id: str = Depends(get_current_user_id)):
    pool, _ = _load_pool()
    by_specialty: dict[str, int] = {}
    by_step: dict[str, int] = {}
    for item in pool:
        spec = str(item.get("practice_specialty") or "other")
        by_specialty[spec] = by_specialty.get(spec, 0) + 1
        mi = str(item.get("practice_meta_info") or "other")
        by_step[mi] = by_step.get(mi, 0) + 1
    return PracticeMcqStatsOut(total=len(pool), by_specialty=by_specialty, by_step=by_step)


@router.get("/random", response_model=PracticeMcqOut)
async def practice_mcq_random(
    specialty: str | None = Query(None, max_length=64),
    step: str | None = Query(None, max_length=16),
    _user_id: str = Depends(get_current_user_id),
):
    pool, _ = _load_pool()
    filtered = _filter_pool(pool, specialty, step)
    if not filtered:
        raise HTTPException(status_code=404, detail="Filtreye uyan soru yok.")
    item = random.choice(filtered)
    return _item_to_out(item)


@router.get("/by-id/{question_id}", response_model=PracticeMcqOut)
async def practice_mcq_by_id(
    question_id: str,
    _user_id: str = Depends(get_current_user_id),
):
    _, by_id = _load_pool()
    item = by_id.get(question_id)
    if not item:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    return _item_to_out(item)


@router.post("/verify", response_model=PracticeMcqVerifyOut)
async def practice_mcq_verify(
    body: PracticeMcqVerifyIn,
    _user_id: str = Depends(get_current_user_id),
):
    _, by_id = _load_pool()
    item = by_id.get(body.id.strip())
    if not item:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    correct_label = str(item.get("correct_option_label") or "").strip().upper()
    sel = body.selected_label.strip().upper()
    if len(sel) >= 1 and sel[0] in "ABCDE":
        sel = sel[0]
    ok = bool(correct_label) and sel == correct_label
    return PracticeMcqVerifyOut(
        correct=ok,
        correct_label=correct_label or "",
        correct_answer_text=str(item.get("correct_answer_text") or ""),
    )
