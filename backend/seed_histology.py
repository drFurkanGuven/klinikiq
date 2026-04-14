"""
Histoloji Görüntüleri Seed Script
Wikimedia Commons'tan açık lisanslı H&E preparatlarını veritabanına ekler.
Kullanım: python seed_histology.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import HistologyImage


IMAGES = [
    # ── Patoloji / Onkoloji ────────────────────────────────────────────────
    {
        "title": "Adrenal Korteks Karsinomu — H&E Orta Büyütme",
        "description": (
            "Adrenokortikal karsinomun orta büyütmeli H&E görünümü. "
            "Hücresel atipi, artmış mitotik aktivite ve kapsüler invazyon izlenmektedir. "
            "TUS'ta Cushing sendromu ayırıcı tanısında sık çıkar."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/f/f1/Adrenal_cortical_carcinoma_-_intermed_mag.jpg",
        "specialty": "endocrinology",
    },
    {
        "title": "Adrenal Korteks Karsinomu — H&E Çok Düşük Büyütme",
        "description": (
            "Adrenokortikal karsinomun tümör mimarisini gösteren düşük büyütmeli görünüm. "
            "Geniş tümör kitlesinin çevre doku ile ilişkisi izlenebilir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/ea/Adrenal_cortical_carcinoma_-_very_low_mag.jpg",
        "specialty": "endocrinology",
    },
    {
        "title": "Lobüler Karsinoma In Situ (LCIS) — Meme",
        "description": (
            "Memenin lobüler karsinomasının in situ evresi. "
            "Lobüllerin disforme hücrelerle dolduğu görülmektedir. "
            "E-kaderin negatifliği ile invaziv duktal karsinomdan ayrılır."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Lobular_carcinoma_in_situ.jpg",
        "specialty": "pathology",
    },
    {
        "title": "Musinöz Karsinom — H&E",
        "description": (
            "Bol müsin gölü içinde yüzen tümör hücre adacıkları görülmektedir. "
            "Meme, kolon ve over musinöz karsinomlarında bu tablo izlenir. "
            "İyi diferansiye, görece iyi prognozlu bir subtip."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/7/77/Mucinous_carcinoma.jpg",
        "specialty": "pathology",
    },
    {
        "title": "Skuamöz Hücreli Karsinom — H&E",
        "description": (
            "Keratin incirleri ve hücrelerarası köprüler içeren skuamöz hücreli karsinom. "
            "Akciğer, baş-boyun, serviks ve deri yerleşimli olabilir. "
            "TUS'ta en sık sorulan karsinom tiplerinden biridir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/4/4f/Squamous_cell_carcinoma_Case_113_%283931952043%29.jpg",
        "specialty": "pathology",
    },

    # ── Pulmoner Patoloji ──────────────────────────────────────────────────
    {
        "title": "Küçük Hücreli Akciğer Karsinomu — H&E",
        "description": (
            "Küçük hücreli akciğer karsinomunda nükleer ezilme (smudging) ve "
            "Azzopardi efekti izlenmektedir. "
            "NSE, CD56, sinaptofizin ve kromogranin pozitif nöroendokrin markırlar beklenir. "
            "Sigara ile güçlü ilişki; paraneoplastik sendromlar TUS'ta sık sorulur."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/f/fc/Histopathology_of_small_cell_carcinoma.jpg",
        "specialty": "pulmonology",
    },
    {
        "title": "Küçük Hücreli Karsinom — Nükleer Smudging",
        "description": (
            "Küçük hücreli karsinomun karakteristik nükleer smudging paterni. "
            "İnce kromatinli, nükleolsüz hücreler birbirine sıkışmış şekilde görülmektedir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/9/96/Histopathology_of_small_cell_carcinoma_-_nuclear_smudging.png",
        "specialty": "pulmonology",
    },

    # ── Nefroloji — Normal Anatomi ─────────────────────────────────────────
    {
        "title": "Böbrek Genel Yapısı — H&E Düşük Büyütme",
        "description": (
            "Böbreğin genel mimarisini gösteren H&E kesiti. "
            "Korteks ve medulla ayrımı, glomerüllerin kortekste düzenli dağılımı izlenmektedir. "
            "Tüm böbrek histolojisini anlamak için temel referans görüntüsüdür."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/0b/Kidney_H%26E.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Böbrek Korteksi — H&E",
        "description": (
            "Böbrek korteksinin H&E görüntüsü. "
            "Glomerüller, proksimal tübüller (geniş lümen, fırçamsı kenar) ve "
            "distal tübüller (dar lümen, düz epitel) ayırt edilebilir. "
            "TUS'ta proksimal ve distal tübül histoloji farkları sık sorulur."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Kidney-Cortex.JPG",
        "specialty": "nephrology",
    },
    {
        "title": "Böbrek Medullası — H&E",
        "description": (
            "Böbrek medullasının H&E görüntüsü. "
            "Toplayıcı kanallar, Henle kulpunun ince ve kalın kolları izlenmektedir. "
            "Medüller yapılar idrar konsantrasyonunda kritik rol oynar."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/2/27/Kidney-medulla.JPG",
        "specialty": "nephrology",
    },
    {
        "title": "Renal Korpüskül (Malpighi Cisimciği) — H&E",
        "description": (
            "Bowman kapsülü içinde glomerülün yüksek büyütmeli görünümü. "
            "Parietal ve viseral epitel (podositler), mezengial hücreler ile "
            "Bowman aralığı seçilebilir. Glomerülonefrit patolojilerinin anlaşılması için temel."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/54/Renal_corpuscle.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Glomerül — PAS Boyası",
        "description": (
            "Periyodik asit-Schiff (PAS) boyasıyla boyanmış glomerül. "
            "Mezangial matriks, bazal membran ve kılcal duvarlar belirginleşmektedir. "
            "PAS; membranöz nefropati, diyabetik nefropati takibinde kullanılan önemli boyamadır."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Glomerulus_pas.JPG",
        "specialty": "nephrology",
    },
    {
        "title": "Böbrek Korteksi — Yüksek Büyütme (Tübüller)",
        "description": (
            "Proksimal tübüllerin ayrıntılı görüntüsü. "
            "Fırçamsı kenar (brush border) ve bol mitokondri içeren sitoplazma seçilmektedir. "
            "Proksimal tübül; glukoz, aminoasit ve bikarbonat geri emiliminin gerçekleştiği bölümdür."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/36/Kidney_cortex_%28947_21%29_Human.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Böbrek Medullası — Toplayıcı Kanallar",
        "description": (
            "Medüller toplayıcı kanalların yüksek büyütmeli görüntüsü. "
            "Küboidal-kolumnar epitel hücreleri ve belirgin hücre sınırları izlenmektedir. "
            "ADH etkisiyle su geçirgenliği artar; nefrojenik DI ayırıcı tanısında önemlidir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/f/f7/Renal_medulla.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Normal Böbrek Histolojisi — Düşük Büyütme",
        "description": (
            "Normal böbrek korteksinin düşük büyütmeli H&E görüntüsü. "
            "Glomerüller, proksimal ve distal tübüller ile Bowman kapsülü seçilebilir. "
            "Patolojik vakaları yorumlamadan önce normal anatomiyi bilmek esastır."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/31/Benign_kidney_--_low_mag.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Normal Böbrek Histolojisi — Orta Büyütme",
        "description": (
            "Böbrek korteksinin orta büyütmeli görüntüsü. "
            "Proksimal tübüllerin fırçamsı kenarlı prizmatik epiteli ile "
            "distal tübüllerin küboidal epiteli arasındaki fark izlenmektedir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Benign_kidney_--_intermed_mag.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Normal Böbrek — Çok Düşük Büyütme",
        "description": (
            "Böbrek korteks-medulla sınırının makroskopik görünümüne yakın büyütme. "
            "Kortikal glomerül dağılımı ve medüller tübüler yapılar seçilmektedir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Benign_kidney_--_very_low_mag.jpg",
        "specialty": "nephrology",
    },

    # ── Nefroloji — Patolojiler ────────────────────────────────────────────
    {
        "title": "Berrak Hücreli Karsinom — Hobnail Hücreleri",
        "description": (
            "Renal berrak hücreli karsinomun karakteristik hobnail hücre paterni. "
            "Sitoplazması berrak, glikojen ve lipid içeren hücreler görülmektedir. "
            "VHL mutasyonu ile ilişkili; en sık renal malignite."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/9/99/Clear_cell_carcinoma_hobnail_cells.png",
        "specialty": "nephrology",
    },
    {
        "title": "Berrak Hücreli Renal Hücreli Karsinom — Grade 1",
        "description": (
            "Berrak hücreli RCC grade 1 görüntüsü. "
            "Sitoplazmaları berrak, nükleolleri belirgin olmayan küçük hücreler içeren asiner yapılar izlenmektedir. "
            "Fuhrman/ISUP grade sistemi TUS'ta sık sorulur; grade arttıkça nükleol belirginleşir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/a/aa/Histopathology_of_clear_cell_renal_cell_carcinoma%2C_grade_1%2C_intermediate_magnification.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Tübüler Atrofi — Kronik Böbrek Hasarı",
        "description": (
            "Kronik böbrek hasarında tübüler atrofi histopatolojisi. "
            "Tübüllerin küçüldüğü, bazal membranın kalınlaştığı ve interstisyel fibrozun arttığı görülmektedir. "
            "Son dönem böbrek hastalığına giden yolda ortak histolojik patern."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/2/2e/Histopathology_of_tubular_atrophy.png",
        "specialty": "nephrology",
    },
    {
        "title": "Membranoproliferatif Glomerülonefrit — H&E",
        "description": (
            "MPGN'nin karakteristik H&E görünümü. "
            "Mezangial hücre proliferasyonu, lobüler glomerüler yapı ve çift kontur (tram-track) paterni. "
            "Tip 1 (immün kompleks depozisyonu) ve Tip 2 (dense deposit) ayrımı IF ve EM ile yapılır."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e7/Mpgn_low_mag.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "IgA Nefropatisi — H&E",
        "description": (
            "IgA nefropatisinin H&E görüntüsü. "
            "Mezangial hücre proliferasyonu ve matriks artışı izlenmektedir. "
            "En sık görülen primer glomerülonefrit; tanıda mezangiyumda IgA birikimi IF ile gösterilir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e1/IgA_nephropathy_-_intermed_mag.jpg",
        "specialty": "nephrology",
    },
    {
        "title": "Diyabetik Nefropati — Kimmelstiel-Wilson Nodülleri",
        "description": (
            "Diyabetik glomerülosklerozdaki Kimmelstiel-Wilson nodülleri. "
            "PAS-pozitif, asellüler nodüler mezangial birikimler ve bazal membran kalınlaşması izlenmektedir. "
            "TUS'ta diyabetik nefropatinin histolojik bulguları sıkça sorulur."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Diabetic_glomerulosclerosis_%282%29_PAS_and_Masson_stain.jpg",
        "specialty": "nephrology",
    },

    # ── Nöropatoloji ──────────────────────────────────────────────────────
    {
        "title": "Displastik Gangliositoma (Lhermitte-Duclos) — H&E",
        "description": (
            "Serebellar displastik gangliositomanın H&E görüntüsü. "
            "Anormal büyük ganglion hücreleri ile bozulmuş serebellar laminasyon izlenmektedir. "
            "PTEN mutasyonu ile ilişkili; Cowden sendromu komponenti."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Dysplastic_gangliocytoma_lhermitte_duclos.jpg",
        "specialty": "neurology",
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Mevcut görüntüleri kontrol et
        from sqlalchemy import select
        result = await db.execute(select(HistologyImage))
        existing = result.scalars().all()
        existing_urls = {img.image_url for img in existing}

        added = 0
        skipped = 0
        for data in IMAGES:
            if data["image_url"] in existing_urls:
                skipped += 1
                continue
            img = HistologyImage(**data)
            db.add(img)
            added += 1

        await db.commit()
        print(f"✓ {added} görüntü eklendi, {skipped} zaten mevcut.")


if __name__ == "__main__":
    asyncio.run(seed())
