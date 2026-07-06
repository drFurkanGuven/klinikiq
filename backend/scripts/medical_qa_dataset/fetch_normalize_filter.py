#!/usr/bin/env python3
"""
MedQA-USMLE (HF: GBaker/MedQA-USMLE-4-options) ve PubMedQA pqa_labeled (HF: qiaojin/PubMedQA)
indirir, normalleştirir, acil odaklı anahtar kelime filtresi uygular.

Kullanım:
  cd backend/scripts/medical_qa_dataset
  pip install -r requirements.txt
  python fetch_normalize_filter.py

Çıktı: ../../data/medical_qa/ (varsayılan)
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any

# -----------------------------------------------------------------------------
# Acil filtresi v2: ağırlıklı puan + PubMedQA için klinik bağlam / dışlama
# -----------------------------------------------------------------------------
# weight 2: yüksek özgüllük (acil servis / kritik durum)
_EMERGENCY_HIGH: list[tuple[str, str, int]] = [
    (r"\bcardiac arrest\b", "cardiac_arrest", 2),
    (r"\brespiratory arrest\b", "respiratory_arrest", 2),
    (r"\bSTEMI\b", "stemi", 2),
    (r"\bNSTEMI\b", "nstemi", 2),
    (r"\bACS\b", "acs", 2),
    (r"\bstatus asthmaticus\b", "status_asthmaticus", 2),
    (r"\bthyroid storm\b", "thyroid_storm", 2),
    (r"\bhypertensive emergency\b", "htn_emergency", 2),
    (r"\bmalignant hyperthermia\b", "malignant_hyperthermia", 2),
    (r"\bneuroleptic malignant syndrome\b", "nms", 2),
    (r"\bseptic shock\b", "septic_shock", 2),
    (r"\banaphylactic shock\b", "anaphylactic_shock", 2),
    (r"\bhypovolemic shock\b", "hypovolemic_shock", 2),
    (r"\bcardiogenic shock\b", "cardiogenic_shock", 2),
    (r"\bobstetric emergency\b", "obstetric_emergency", 2),
    (r"\bectopic pregnancy\b", "ectopic_pregnancy", 2),
    (r"\bpulmonary embolism\b", "pe", 2),
    (r"\baortic dissection\b", "aortic_dissection", 2),
    (r"\btension pneumothorax\b", "tension_pneumo", 2),
    (r"\bGI bleed\b", "gi_bleed", 2),
    (r"\bupper GI bleed\b", "upper_gi_bleed", 2),
    (r"\bintra.?abdominal hemorrhage\b", "intraabdominal_hemorrhage", 2),
    (r"\bintracranial hemorrhage\b", "ich", 2),
    (r"\bsubarachnoid hemorrhage\b", "sah", 2),
    (r"\bstatus epilepticus\b", "status_epilepticus", 2),
    (r"\bacute coronary syndrome\b", "acs_phrase", 2),
    (r"\bacute mesenteric ischemia\b", "mesenteric_ischemia", 2),
    (r"\bacute limb ischemia\b", "limb_ischemia", 2),
    (r"\bcompartment syndrome\b", "compartment_syndrome", 2),
    (r"\bnecrotizing fasciitis\b", "nec_fasciitis", 2),
    (r"\b(salicylate toxicity|aspirin overdose|salicylate poisoning)\b", "salicylate_tox", 2),
    (r"\bemergency department\b", "ed_phrase", 2),
    (r"\bemergency room\b", "er_phrase", 2),
    (r"\bED visit\b", "ed_visit", 2),
    (r"\bresuscitation\b", "resuscitation", 2),
    (r"\bCPR\b", "cpr", 2),
    (r"\bcode blue\b", "code_blue", 2),
    (r"\brapid response\b", "rapid_response", 2),
    (r"\btriage\b", "triage", 2),
    (r"\bairway (obstruction|management|compromise)\b", "airway_obstruction", 2),
    (r"\brespiratory failure\b", "respiratory_failure", 2),
    (r"\bacute hypoxic\b", "acute_hypoxic", 2),
    (r"\bARDS\b", "ards", 2),
    (r"\bDKA\b", "dka", 2),
    (r"\bHHS\b", "hhs", 2),
    (r"\badrenal crisis\b", "adrenal_crisis", 2),
    (r"\bout of hospital\b", "ooh", 2),
    (r"\bprehospital\b", "prehospital", 2),
    (r"\bEMS\b", "ems", 2),
    (r"\bparamedic\b", "paramedic", 2),
    # Türkçe
    (r"\bacil servis\b", "tr_acil_servis", 2),
    (r"\byoğun bakım\b", "tr_yb", 2),
]

# weight 1: geniş ama acille ilişkilendirilebilir
_EMERGENCY_NORMAL: list[tuple[str, str, int]] = [
    (r"\bacute\b", "acute", 1),
    (r"\bemergency\b", "emergency", 1),
    (r"\bemergent\b", "emergent", 1),
    (r"\btrauma\b", "trauma", 1),
    (r"\bshock\b", "shock", 1),
    (r"\bsepsis\b", "sepsis", 1),
    (r"\bseptic\b", "septic", 1),
    (r"\bchest pain\b", "chest_pain", 1),
    (r"\bdyspnea\b", "dyspnea", 1),
    (r"\bshortness of breath\b", "sob", 1),
    (r"\bmyocardial infarction\b", "mi", 1),
    (r"\bstroke\b", "stroke", 1),
    (r"\bTIA\b", "tia", 1),
    (r"\boverdose\b", "overdose", 1),
    (r"\bpoisoning\b", "poisoning", 1),
    (r"\btoxic ingestion\b", "toxic_ingestion", 1),
    (r"\bbleeding\b", "bleeding", 1),
    (r"\bhemorrhage\b", "hemorrhage", 1),
    (r"\bhypotension\b", "hypotension", 1),
    (r"\btachycardia\b", "tachycardia", 1),
    (r"\bbradycardia\b", "bradycardia", 1),
    (r"\banaphylaxis\b", "anaphylaxis", 1),
    (r"\bfracture\b", "fracture", 1),
    (r"\bhead injury\b", "head_injury", 1),
    (r"\bblunt trauma\b", "blunt_trauma", 1),
    (r"\bpenetrating trauma\b", "penetrating_trauma", 1),
    (r"\bburns?\b", "burn", 1),
    (r"\bappendicitis\b", "appendicitis", 1),
    (r"\bcholecystitis\b", "cholecystitis", 1),
    (r"\bacute abdomen\b", "acute_abdomen", 1),
    (r"\bperitonitis\b", "peritonitis", 1),
    (r"\baltered mental status\b", "ams", 1),
    (r"\bencephalopathy\b", "encephalopathy", 1),
    (r"\bseizure\b", "seizure", 1),
    (r"\bsyncope\b", "syncope", 1),
    (r"\bdecompensated\b", "decompensated", 1),
    (r"\bairway\b", "airway", 1),
    (r"\bintubation\b", "intubation", 1),
    (r"\bventilator\b", "ventilator", 1),
    (r"\bICU\b", "icu", 1),
    (r"\bvasopressor\b", "vasopressor", 1),
    (r"\bpressor\b", "pressor", 1),
    (r"\bnorepinephrine\b", "norepinephrine", 1),
    (r"\bfluid resuscitation\b", "fluid_resuscitation", 1),
    (r"\bacil\b", "tr_acil", 1),
    (r"\btravma\b", "tr_travma", 1),
    (r"\bşok\b", "tr_sok", 1),
    (r"\bkalp krizi\b", "tr_kalp_krizi", 1),
]

_ALL_WEIGHTED: list[tuple[re.Pattern[str], str, int]] = [
    (re.compile(p, re.IGNORECASE), name, w) for p, name, w in _EMERGENCY_HIGH
] + [
    (re.compile(p, re.IGNORECASE), name, w) for p, name, w in _EMERGENCY_NORMAL
]

# PubMedQA: temel bilim / model organizma — insan klinik bağlamı yoksa ele
_PUBMED_EXCLUDE: list[re.Pattern[str]] = [
    re.compile(r"\b(zebrafish|drosophila|arabidopsis|caenorhabditis|c\. elegans)\b", re.I),
    re.compile(r"\blace plant\b", re.I),
    re.compile(r"\bSaccharomyces\b", re.I),
    re.compile(r"\byeast two-hybrid\b", re.I),
]

# İnsan klinik senaryosu ipuçları (PubMed için “vaka” doğrulaması)
_CLINICAL_CONTEXT = re.compile(
    r"\b("
    r"year-old|years old|y/o\b|"
    r"patient|patients|"
    r"presented (with|to)|presents (with|to)|presentation|"
    r"admitted (to|with)|hospitalized|hospital admission|"
    r"emergency department|\bED\b|\bER\b|"
    r"intensive care|ICU admission|"
    r"man with|woman with|male|female|boy|girl|infant|neonate|elderly"
    r")\b",
    re.I,
)


def _emergency_score(text: str) -> tuple[int, list[str]]:
    """Aynı isim için en yüksek ağırlığı al; toplam puan döndür."""
    if not text:
        return 0, []
    best: dict[str, int] = {}
    for rx, name, w in _ALL_WEIGHTED:
        if rx.search(text):
            prev = best.get(name, 0)
            if w > prev:
                best[name] = w
    total = sum(best.values())
    return total, sorted(best.keys())


def _pubmed_should_exclude(text: str) -> bool:
    """Açıkça temel bilim / model organizma ve insan vaka sinyali yoksa ele."""
    if not text.strip():
        return True
    for rx in _PUBMED_EXCLUDE:
        if rx.search(text):
            if _CLINICAL_CONTEXT.search(text):
                continue
            return True
    # in vitro / cell line: insan klinik bağlamı yoksa ele
    if re.search(r"\b(in vitro|cell line|cell culture)\b", text, re.I):
        if not _CLINICAL_CONTEXT.search(text):
            return True
    return False


def _has_clinical_context(text: str) -> bool:
    return bool(_CLINICAL_CONTEXT.search(text))


def passes_emergency_filter(source: str, blob: str) -> tuple[bool, dict[str, Any]]:
    """
    MedQA: yüksek acil sinyali veya toplam puan eşiği.
    PubMedQA: dışlama + (klinik bağlam + puan) veya çok yüksek puan.
    """
    score, names = _emergency_score(blob)
    meta: dict[str, Any] = {
        "emergency_score": score,
        "matched_keywords": names,
    }
    if source == "pubmedqa_labeled":
        meta["pubmed_excluded"] = _pubmed_should_exclude(blob)
        meta["clinical_context"] = _has_clinical_context(blob)
        if meta["pubmed_excluded"]:
            return False, meta
        # Klinik vignette + makul acil puanı, veya çok güçlü acil yükü
        if meta["clinical_context"] and score >= 3:
            return True, meta
        if score >= 5:
            return True, meta
        if meta["clinical_context"] and score >= 2 and any(
            n in names
            for n in (
                "cardiac_arrest",
                "stemi",
                "nstemi",
                "septic_shock",
                "pe",
                "gi_bleed",
                "status_epilepticus",
                "ed_phrase",
                "resuscitation",
                "triage",
            )
        ):
            return True, meta
        return False, meta

    # medqa_usmle: USMLE vinyeti çoğunlukla klinik; puan veya güçlü tek sinyal
    _STRONG_ONE = frozenset(
        {
            "stemi",
            "nstemi",
            "cardiac_arrest",
            "septic_shock",
            "pe",
            "tension_pneumo",
            "aortic_dissection",
            "gi_bleed",
            "status_epilepticus",
            "ed_phrase",
            "resuscitation",
            "respiratory_failure",
            "triage",
            "nec_fasciitis",
            "ich",
            "sah",
        }
    )
    if score >= 3:
        return True, meta
    if score >= 2:
        return True, meta
    if score >= 1 and names and set(names) & _STRONG_ONE:
        return True, meta
    return False, meta


def _flatten_pubmed_context(ctx: Any) -> str:
    if isinstance(ctx, dict):
        parts = ctx.get("contexts") or []
        if isinstance(parts, list):
            return " ".join(str(x) for x in parts if x)
    return str(ctx) if ctx else ""


def normalize_medqa_row(split: str, idx: int, row: dict[str, Any]) -> dict[str, Any]:
    opts = row.get("options") or {}
    options_list: list[dict[str, str]] = []
    if isinstance(opts, dict):
        for label in sorted(opts.keys()):
            options_list.append({"label": label, "text": str(opts[label])})
    idx_l = row.get("answer_idx")
    letter = str(idx_l).strip().upper() if idx_l is not None else ""
    ci: int | None = None
    if letter and options_list:
        for i, o in enumerate(options_list):
            if o["label"].upper() == letter:
                ci = i
                break
    return {
        "id": f"medqa_usmle:{split}:{idx}",
        "source": "medqa_usmle",
        "source_split": split,
        "source_row_index": idx,
        "question_type": "mcq_four",
        "question": str(row.get("question") or ""),
        "options": options_list,
        "correct_option_label": letter or None,
        "correct_option_index": ci,
        "correct_answer_text": str(row.get("answer") or "") or None,
        "final_decision": None,
        "context_excerpt": None,
        "meta": {
            "meta_info": row.get("meta_info"),
            "metamap_phrases": row.get("metamap_phrases"),
        },
    }


def normalize_pubmed_row(split: str, idx: int, row: dict[str, Any]) -> dict[str, Any]:
    ctx = _flatten_pubmed_context(row.get("context"))
    q = str(row.get("question") or "")
    return {
        "id": f"pubmedqa_labeled:{split}:{idx}",
        "source": "pubmedqa_labeled",
        "source_split": split,
        "source_row_index": idx,
        "question_type": "yes_no_maybe",
        "question": q,
        "options": None,
        "correct_option_label": None,
        "correct_option_index": None,
        "correct_answer_text": None,
        "final_decision": str(row.get("final_decision") or "").lower() or None,
        "context_excerpt": ctx[:8000] if ctx else None,
        "meta": {"pubid": row.get("pubid"), "context_raw": row.get("context")},
    }


def text_for_filtering(rec: dict[str, Any]) -> str:
    parts = [rec.get("question") or ""]
    opts = rec.get("options")
    if isinstance(opts, list):
        for o in opts:
            if isinstance(o, dict):
                parts.append(o.get("text") or "")
    if rec.get("context_excerpt"):
        parts.append(str(rec["context_excerpt"]))
    return "\n".join(parts)


def apply_emergency_filter(rec: dict[str, Any]) -> dict[str, Any] | None:
    blob = text_for_filtering(rec)
    source = str(rec.get("source") or "")
    ok, fmeta = passes_emergency_filter(source, blob)
    if not ok:
        return None
    out = dict(rec)
    out["matched_keywords"] = fmeta.get("matched_keywords") or []
    out["filter_meta"] = fmeta
    return out


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="MedQA + PubMedQA indir, normalize et, acil filtrele")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data" / "medical_qa",
        help="Çıktı kökü (varsayılan: backend/data/medical_qa)",
    )
    args = parser.parse_args()
    out: Path = args.out

    raw_dir = out / "raw"
    emergency_dir = out / "emergency"
    raw_dir.mkdir(parents=True, exist_ok=True)
    emergency_dir.mkdir(parents=True, exist_ok=True)

    # Lisans dosyalarını çıktıya kopyala (dağıtımda tek klasörde dursun)
    lic_src = Path(__file__).resolve().parent / "licenses"
    lic_dst = out / "licenses"
    if lic_src.is_dir():
        shutil.copytree(lic_src, lic_dst, dirs_exist_ok=True)

    schema_src = Path(__file__).resolve().parent / "schema" / "klinikiq_emergency_item.schema.json"
    schema_dst = out / "schema" / "klinikiq_emergency_item.schema.json"
    if schema_src.is_file():
        schema_dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(schema_src, schema_dst)

    from datasets import load_dataset

    stats: dict[str, Any] = {
        "filter_version": "v2_weighted_pubmed_clinical_gate",
        "medqa_usmle": {"splits": {}},
        "pubmedqa_labeled": {"splits": {}},
        "emergency_filtered": {"medqa_usmle": 0, "pubmedqa_labeled": 0},
    }

    # --- MedQA ---
    medqa = load_dataset("GBaker/MedQA-USMLE-4-options")
    medqa_all: list[dict[str, Any]] = []
    medqa_em: list[dict[str, Any]] = []
    for split_name in medqa.keys():
        ds = medqa[split_name]
        n = len(ds)
        stats["medqa_usmle"]["splits"][split_name] = n
        for i in range(n):
            row = normalize_medqa_row(split_name, i, ds[i])
            medqa_all.append(row)
            fe = apply_emergency_filter(row)
            if fe:
                medqa_em.append(fe)
        write_jsonl(raw_dir / f"medqa_usmle_{split_name}.jsonl", [normalize_medqa_row(split_name, i, ds[i]) for i in range(n)])
    stats["emergency_filtered"]["medqa_usmle"] = len(medqa_em)
    write_jsonl(emergency_dir / "medqa_usmle_emergency.jsonl", medqa_em)

    # --- PubMedQA pqa_labeled ---
    pub = load_dataset("qiaojin/PubMedQA", "pqa_labeled")
    pub_all: list[dict[str, Any]] = []
    pub_em: list[dict[str, Any]] = []
    for split_name in pub.keys():
        ds = pub[split_name]
        n = len(ds)
        stats["pubmedqa_labeled"]["splits"][split_name] = n
        for i in range(n):
            row = normalize_pubmed_row(split_name, i, ds[i])
            pub_all.append(row)
            fe = apply_emergency_filter(row)
            if fe:
                pub_em.append(fe)
        write_jsonl(raw_dir / f"pubmedqa_labeled_{split_name}.jsonl", [normalize_pubmed_row(split_name, i, ds[i]) for i in range(n)])
    stats["emergency_filtered"]["pubmedqa_labeled"] = len(pub_em)
    write_jsonl(emergency_dir / "pubmedqa_labeled_emergency.jsonl", pub_em)

    unified = medqa_em + pub_em
    write_jsonl(emergency_dir / "unified_emergency.jsonl", unified)

    stats["totals"] = {
        "medqa_raw_rows": len(medqa_all),
        "pubmed_raw_rows": len(pub_all),
        "unified_emergency_rows": len(unified),
    }

    (out / "stats.json").write_text(json.dumps(stats, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("Tamamlandı.")
    print(f"  Çıktı: {out}")
    print(f"  Birleşik acil satır: {len(unified)} (MedQA acil: {len(medqa_em)}, PubMedQA acil: {len(pub_em)})")
    print(f"  stats.json ve licenses/ güncellendi.")


if __name__ == "__main__":
    main()
