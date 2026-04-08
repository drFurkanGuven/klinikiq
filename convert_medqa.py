"""
MedQA TR → KlinikIQ Case JSON Dönüştürücü
==========================================
Kullanım:
  python convert_medqa.py --input medqa_finetune_train_TR.jsonl --output cases_ready.jsonl

Çeviri henüz bitmemişse İngilizce versiyonla da çalışır:
  python convert_medqa.py --input medqa_finetune_train_en.jsonl --output cases_ready.jsonl
"""

import json
import re
import argparse
from pathlib import Path

# ── Uzmanlık alanı tespiti ──────────────────────────────
SPECIALTY_KEYWORDS = {
    "cardiology": [
        "kalp", "miyokard", "angina", "enfarktüs", "aritmia", "atriyal",
        "ventriküler", "hipertansiyon", "aort", "koroner", "ekg", "troponin",
        "heart", "cardiac", "myocardial", "infarction", "arrhythmia", "atrial",
        "ventricular", "hypertension", "aortic", "coronary"
    ],
    "endocrinology": [
        "diyabet", "insülin", "tiroid", "hipotiroid", "hipertiroid", "adrenal",
        "kortizol", "cushing", "addison", "paratiroid", "hipofiz", "akromegali",
        "diabetes", "insulin", "thyroid", "hypothyroid", "hyperthyroid",
        "adrenal", "cortisol", "pituitary", "acromegaly"
    ],
    "neurology": [
        "nöroloji", "beyin", "felç", "inme", "epilepsi", "nöbet", "baş ağrısı",
        "migren", "parkinson", "alzheimer", "multiple skleroz", "ensefalit",
        "menenjit", "subaraknoid", "stroke", "seizure", "headache", "migraine",
        "meningitis", "encephalitis", "subarachnoid", "neurological"
    ],
    "gastroenterology": [
        "karaciğer", "bağırsak", "kolon", "mide", "pankreas", "safra",
        "siroz", "hepatit", "ülser", "crohn", "colitis", "amilaz", "lipaz",
        "liver", "intestine", "colon", "stomach", "pancreas", "gallbladder",
        "cirrhosis", "hepatitis", "ulcer", "amylase", "lipase"
    ],
    "nephrology": [
        "böbrek", "renal", "nefrit", "glomerülonefrit", "kreatinin", "üre",
        "proteinüri", "hematüri", "diyaliz", "kidney", "renal", "nephritis",
        "glomerulonephritis", "creatinine", "urea", "proteinuria", "hematuria"
    ],
    "pulmonology": [
        "akciğer", "solunum", "astım", "koah", "pnömoni", "tüberküloz",
        "plevra", "emboli", "lung", "respiratory", "asthma", "copd",
        "pneumonia", "tuberculosis", "pleura", "embolism", "dyspnea"
    ],
    "infectious_disease": [
        "enfeksiyon", "bakteri", "virüs", "antibiyotik", "sepsis", "ateş",
        "infection", "bacterial", "viral", "antibiotic", "fever", "sepsis"
    ],
    "hematology": [
        "kan", "anemi", "lösemi", "lenfoma", "trombosit", "hemoglobin",
        "blood", "anemia", "leukemia", "lymphoma", "platelet", "hemoglobin"
    ],
    "rheumatology": [
        "romatoid", "lupus", "artrit", "gut", "skleroderma",
        "rheumatoid", "arthritis", "gout", "scleroderma", "autoimmune"
    ],
    "general": []  # varsayılan
}

# ── Zorluk tespiti ──────────────────────────────────────
DIFFICULTY_HARD_KEYWORDS = [
    "subaraknoid", "feokromositoma", "wilson", "hemokromatoz", "takayasu",
    "wegener", "goodpasture", "subarachnoid", "pheochromocytoma", "hemochromatosis"
]
DIFFICULTY_EASY_KEYWORDS = [
    "diyabet tip 2", "hipertansiyon", "uti", "idrar yolu", "grip",
    "diabetes type 2", "hypertension", "urinary tract", "influenza", "common cold"
]


def detect_specialty(text: str) -> str:
    text_lower = text.lower()
    scores = {}
    for specialty, keywords in SPECIALTY_KEYWORDS.items():
        if specialty == "general":
            continue
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[specialty] = score
    if not scores:
        return "general"
    return max(scores, key=scores.get)


def detect_difficulty(text: str, answer: str) -> str:
    combined = (text + " " + answer).lower()
    if any(kw in combined for kw in DIFFICULTY_HARD_KEYWORDS):
        return "hard"
    if any(kw in combined for kw in DIFFICULTY_EASY_KEYWORDS):
        return "easy"
    return "medium"


def extract_patient_info(question: str) -> dict:
    """Sorudan hasta yaşı, cinsiyeti ve baş yakınmasını çıkarır."""
    info = {
        "name": "Hasta",
        "age": None,
        "gender": None,
        "chief_complaint": "",
        "presentation": question[:500] if len(question) > 500 else question
    }

    # Yaş tespiti — "58-year-old", "58 yaşında", "58-yaşında"
    age_patterns = [
        r'(\d+)[- ]?year[- ]?old',
        r'(\d+)\s*yaş(?:ında|lı)',
        r'(\d+)\s*-\s*yaş',
    ]
    for pattern in age_patterns:
        m = re.search(pattern, question, re.IGNORECASE)
        if m:
            info["age"] = int(m.group(1))
            break

    # Cinsiyet tespiti
    male_words = ["male", "man", "boy", "his ", "he ", "erkek", "adam", "oğlan"]
    female_words = ["female", "woman", "girl", "her ", "she ", "kadın", "kız", "bayan"]
    q_lower = question.lower()

    male_score = sum(1 for w in male_words if w in q_lower)
    female_score = sum(1 for w in female_words if w in q_lower)

    if male_score > female_score:
        info["gender"] = "erkek"
        info["name"] = "Mehmet"
    elif female_score > male_score:
        info["gender"] = "kadın"
        info["name"] = "Ayşe"
    else:
        info["gender"] = "bilinmiyor"
        info["name"] = "Hasta"

    # Baş yakınma — ilk cümleden çıkar
    sentences = question.split('.')
    if sentences:
        info["chief_complaint"] = sentences[0].strip()[:200]

    return info


def build_patient_json(question: str, answer: str) -> dict:
    """Tam patient_json objesi oluşturur."""
    info = extract_patient_info(question)
    return {
        "name": info["name"],
        "age": info["age"] or 45,
        "gender": info["gender"],
        "chief_complaint": info["chief_complaint"],
        "presentation": info["presentation"],
        "simulation_instructions": (
            f"Sen {info['name']} adında, {info['age'] or 45} yaşında bir {info['gender']} hastasın. "
            f"Doktora başvurma sebebin: {info['chief_complaint'][:100]}. "
            "Sadece sorulanlara cevap ver. Türkçe konuş. Gizli tanıyı kendiliğinden açıklama."
        )
    }


def build_scoring_rubric(question: str, answer: str) -> dict:
    """Temel scoring rubric oluşturur."""
    return {
        "correct_diagnosis": answer,
        "key_symptoms_to_ask": [],   # Uzman onayıyla doldurulacak
        "key_exams_to_order": [],    # Uzman onayıyla doldurulacak
        "differential_diagnoses": [],
        "min_passing_score": 60
    }


def convert_entry(item: dict, idx: int) -> dict:
    """Tek bir MedQA entry'sini Case formatına dönüştürür."""
    messages = item.get("messages", [])
    meta = item.get("meta", {})

    # Mesajlardan question ve answer'ı çek
    question = ""
    answer = ""
    for msg in messages:
        if msg.get("role") == "user":
            question = msg.get("content", "")
        elif msg.get("role") == "assistant":
            answer = msg.get("content", "")

    if not question or not answer:
        return None

    specialty = detect_specialty(question + " " + answer)
    difficulty = detect_difficulty(question, answer)

    return {
        "title": f"Vaka #{idx+1}: {answer[:60]}{'...' if len(answer) > 60 else ''}",
        "specialty": specialty,
        "difficulty": difficulty,
        "patient_json": build_patient_json(question, answer),
        "hidden_diagnosis": answer,
        "full_question": question,
        "scoring_rubric": build_scoring_rubric(question, answer),
        "educational_notes": {
            "diagnosis": answer,
            "pathophysiology": "",   # Uzman onayıyla doldurulacak
            "tus_relevance": f"USMLE Step {meta.get('step', '2&3')} seviyesi soru",
            "source": "MedQA-USMLE"
        },
        "is_active": True,
        "meta": meta
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="medqa_finetune_train_TR.jsonl",
                        help="Girdi JSONL dosyası (TR veya EN)")
    parser.add_argument("--output", default="cases_ready.jsonl",
                        help="Çıktı JSONL dosyası")
    parser.add_argument("--limit",  type=int, default=None,
                        help="Sadece ilk N vakayı işle (test için)")
    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"HATA: {args.input} bulunamadı.")
        print("Çeviri henüz bitmemişse İngilizce versiyonu dene:")
        print("  python convert_medqa.py --input medqa_finetune_train_en.jsonl")
        return

    results = []
    skipped = 0

    with open(args.input, encoding="utf-8") as f:
        lines = f.readlines()

    if args.limit:
        lines = lines[:args.limit]

    print(f"Toplam {len(lines)} vaka işlenecek...")

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
            case = convert_entry(item, i)
            if case:
                results.append(case)
            else:
                skipped += 1
        except Exception as e:
            skipped += 1
            if i < 5:
                print(f"  [UYARI] Satır {i} atlandı: {e}")

    with open(args.output, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"\nTamamlandı!")
    print(f"  Dönüştürülen: {len(results)} vaka")
    print(f"  Atlanan:      {skipped} vaka")
    print(f"  Çıktı:        {args.output}")

    # Uzmanlık dağılımını göster
    from collections import Counter
    specialties = Counter(r["specialty"] for r in results)
    print("\nUzmanlık dağılımı:")
    for spec, count in specialties.most_common():
        print(f"  {spec:25s} → {count} vaka")


if __name__ == "__main__":
    main()
