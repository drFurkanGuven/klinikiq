"""
Seed Script — 3 örnek vaka ekler
Kullanım: python seed.py
"""
import asyncio
import sys
import os

# Backend root'u path'e ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import Case


CASES = [
    # ── Vaka 1: Kardiyoloji (Orta) ─────────────────────────────────────────
    {
        "title": "Göğüs Ağrısı ile Başvuran Orta Yaşlı Erkek",
        "specialty": "cardiology",
        "difficulty": "medium",
        "patient_json": {
            "name": "Mehmet",
            "age": 58,
            "gender": "erkek",
            "chief_complaint": "Eforla artan sol göğüs ağrısı",
            "history": (
                "30 yıldır günde 1 paket sigara içiyor. "
                "Hipertansiyon tanısıyla 5 yıldır ilaç kullanıyor. "
                "Babasında 55 yaşında miyokard enfarktüsü öyküsü var. "
                "Son 3 haftadır merdiven çıkarken ve hızlı yürürken "
                "sol göğüste sıkışma tarzında ağrı hissediyor. "
                "Ağrı 5-10 dakika sürüyor, dinlenince geçiyor. "
                "Çenesi ve sol koluna yayılım oluyor."
            ),
            "vitals": {
                "KB": "148/92 mmHg",
                "Nabız": "82 /dk, ritmik",
                "SpO2": "%97",
                "Ateş": "36.8°C",
                "Solunum": "16 /dk"
            },
            "physical_exam": {
                "genel": "Orta yaşlı erkek, hafif endişeli görünüm",
                "kalp": "S1-S2 normal, ek ses yok, üfürüm yok",
                "akciger": "Bilateral bazallerde hafif krepitan",
                "abdomen": "Normal"
            }
        },
        "hidden_diagnosis": "Kararsız Angina Pektoris",
        "scoring_rubric": {
            "primary_diagnosis": "Kararsız Angina Pektoris",
            "differential_diagnoses": [
                "Stabil Angina",
                "NSTEMI",
                "Aort Stenozu"
            ],
            "key_findings": [
                "Risk faktörleri (sigara, HT, aile öyküsü)",
                "Eforla artan, dinlenince geçen göğüs ağrısı",
                "Son 3 haftada kötüleşen seyir",
                "Çene ve sol kola yayılım"
            ],
            "point_weights": {
                "doğru_primer_tanı": 40,
                "diferansiyel_tanı": 20,
                "risk_faktörleri_sorgusu": 20,
                "ek_tetkik_önerisi": 20
            }
        },
        "educational_notes": (
            "Kararsız angina pektoris (KAP), istirahat angina ve de novo efor anginasını kapsar. "
            "TIMI ve GRACE skorlaması risk sınıflandırmasında kullanılır. "
            "Tedavi: antiplatelet, antikoagülan, nitrat ve β-bloker. "
            "Acil koroner anjiyografi endikasyonu yüksek riskli hastalarda."
        ),
        "is_active": True,
    },

    # ── Vaka 2: Endokrinoloji (Kolay) ──────────────────────────────────────
    {
        "title": "Poliüri ve Polidipsi ile Gelen Genç Hasta",
        "specialty": "endocrinology",
        "difficulty": "easy",
        "patient_json": {
            "name": "Ayşe",
            "age": 24,
            "gender": "kadın",
            "chief_complaint": "2 aydır aşırı su içme ve sık idrara çıkma",
            "history": (
                "2 aydır günde 5-6 litre su içiyor. "
                "Gece de 3-4 kez kalkmak zorunda kalıyor. "
                "5 kg kilo kaybı var (2 ayda). "
                "Yorgunluk ve halsizlik şikayeti var. "
                "Ailede diyabet öyküsü yok. "
                "Geçen hafta muayenehane testinde kan şekeri 320 mg/dL bulunmuş. "
                "İdrarda keton pozitif saptanmış."
            ),
            "vitals": {
                "KB": "110/70 mmHg",
                "Nabız": "96 /dk",
                "Ateş": "36.6°C",
                "Kilo": "52 kg (önceki 57 kg)",
                "SpO2": "%99"
            },
            "physical_exam": {
                "genel": "Zayıf görünümlü genç kadın, hafif dehidrate",
                "cilt": "Turgor-tonus azalmış",
                "ağız": "Kuru mukoza",
                "abdomen": "Normal"
            }
        },
        "hidden_diagnosis": "Tip 1 Diabetes Mellitus",
        "scoring_rubric": {
            "primary_diagnosis": "Tip 1 Diabetes Mellitus",
            "differential_diagnoses": [
                "Tip 2 Diabetes Mellitus",
                "Diabetes İnsipidus",
                "MODY"
            ],
            "key_findings": [
                "Poliüri, polidipsi, polifaji üçlüsü",
                "Kilo kaybı",
                "İdrarda keton pozitifliği",
                "Genç yaş ve akut başlangıç"
            ],
            "point_weights": {
                "doğru_primer_tanı": 40,
                "keton_sorgusu": 20,
                "otoimmün_patogenez": 20,
                "tedavi_planı": 20
            }
        },
        "educational_notes": (
            "Tip 1 DM pankreatik β-hücre yıkımına bağlı mutlak insülin eksikliğiyle karakterizedir. "
            "HbA1c, C-peptid, anti-GAD antikorları tanıda önemlidir. "
            "DKA riski yüksek; insülin tedavisi zorunludur. "
            "TUS'ta genellikle DKA yönetimi ve insülin tipleri sorulur."
        ),
        "is_active": True,
    },

    # ── Vaka 3: Nöroloji (Zor) ─────────────────────────────────────────────
    {
        "title": "Ani Başlayan Baş Ağrısı ve Ense Sertliği",
        "specialty": "neurology",
        "difficulty": "hard",
        "patient_json": {
            "name": "Can",
            "age": 32,
            "gender": "erkek",
            "chief_complaint": "Hayatımın en kötü baş ağrısı ve ense tutulması",
            "history": (
                "2 saat önce ani başlayan şiddetli baş ağrısı. "
                "Daha önce hiç böyle bir ağrı yaşamamış. "
                "Ense sertliği ve ışıktan rahatsızlık var. "
                "Hafif bulantı-kusma olmuş. "
                "Geçici görme bulanıklığı tanımlıyor. "
                "Bilinç açık ama ağrıdan ajite görünüyor. "
                "Ateş yok. Travma yok."
            ),
            "vitals": {
                "KB": "162/95 mmHg",
                "Nabız": "88 /dk",
                "Ateş": "37.0°C",
                "SpO2": "%98",
                "GKS": "15"
            },
            "physical_exam": {
                "genel": "Ajite, ağrılı görünüm",
                "nörolojik": "Bilinç açık, oryantasyon tam, ense sertliği pozitif, Kernig pozitif",
                "göz": "Pupiller izokorik, ışık refleksi normal, fundus muayene edilemedi",
                "kalp_akciger": "Normal"
            }
        },
        "hidden_diagnosis": "Subaraknoid Kanama",
        "scoring_rubric": {
            "primary_diagnosis": "Subaraknoid Kanama",
            "differential_diagnoses": [
                "Bakteriyel Menenjit",
                "Migren",
                "Hipertansif Ensefalopati"
            ],
            "key_findings": [
                "Thunderclap headache (hayatımın en kötü baş ağrısı)",
                "Ani başlangıç",
                "Ense sertliği (meningismus)",
                "Kernig pozitifliği",
                "Ateş yokluğu (menenjiti ekarte eder)"
            ],
            "point_weights": {
                "doğru_primer_tanı": 50,
                "acil_bt_önerisi": 20,
                "LP_endikasyonu": 15,
                "diferansiyel_tanı": 15
            }
        },
        "educational_notes": (
            "SAK, intrakraniyal anevrizma rüptürünün klasik sunumudur. "
            "Thunderclap headache → acil non-kontrastlı BT (ilk 6 saatte %98 sensitif). "
            "BT negatifse LP: ksantokromi ve eritrosit var. "
            "Hunt-Hess ve Fisher skalası prognoz için kullanılır. "
            "Rebleeding ve vazospazm başlıca komplikasyonlardır. "
            "TUS'ta SAK vs menenjit ayırımı sık çıkar."
        ),
        "is_active": True,
    },
]


async def seed():
    print("🌱 Veritabanı tabloları oluşturuluyor...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("📦 Örnek vakalar ekleniyor...")
    async with AsyncSessionLocal() as db:
        for case_data in CASES:
            # Aynı başlıklı vaka varsa ekleme
            from sqlalchemy import select
            result = await db.execute(
                select(Case).where(Case.title == case_data["title"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  ⏭️  Zaten mevcut: {case_data['title']}")
                continue

            case = Case(**case_data)
            db.add(case)
            print(f"  ✅ Eklendi: {case_data['title']}")

        await db.commit()

    print("\n🎉 Seed tamamlandı!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
