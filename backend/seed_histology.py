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


def commons_thumb(full_url: str, width: int = 400) -> str:
    """Wikimedia Commons tam URL'sinden liste küçük resim yolu üretir (daha hızlı kart önizlemesi)."""
    if "upload.wikimedia.org" not in full_url or "/wikipedia/commons/" not in full_url:
        return full_url
    if "/commons/thumb/" in full_url:
        return full_url
    path, filename = full_url.rsplit("/", 1)
    thumb_base = path.replace("/commons/", "/commons/thumb/")
    return f"{thumb_base}/{filename}/{width}px-{filename}"


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
        "stain": "H&E",
        "organ": "Adrenal",
    },
    {
        "title": "Adrenal Korteks Karsinomu — H&E Çok Düşük Büyütme",
        "description": (
            "Adrenokortikal karsinomun tümör mimarisini gösteren düşük büyütmeli görünüm. "
            "Geniş tümör kitlesinin çevre doku ile ilişkisi izlenebilir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/ea/Adrenal_cortical_carcinoma_-_very_low_mag.jpg",
        "specialty": "endocrinology",
        "stain": "H&E",
        "organ": "Adrenal",
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
        "stain": "H&E",
        "organ": "Böbrek",
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
        "stain": "H&E",
        "organ": "Serebellum",
    },
]

# Temel bilimler / histoloji müfredatı — [Histology Guide](https://histologyguide.com) yapısına yakın:
# hücre ve doku + seçilmiş organ sistemleri (Wikimedia Commons, açık lisans).
BASIC_CURRICULUM_IMAGES = [
    {
        "title": "Küboidal epitel — kesit",
        "description": (
            "Basit küboidal epitel örneği. Salgı bezleri, böbrek tübülleri ve tiroid folikülleri "
            "çevresinde sık görülür; absorpsiyon ve sekresyon ile ilişkilidir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/d/db/Cuboidal_Epithelium_Section.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Epitel",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "epithelium",
    },
    {
        "title": "Kolumnar (silindirik) epitel",
        "description": (
            "Basit kolumnar epitel; mide-bağırsak mukozası ve salgı yapan kanallarda yaygındır. "
            "Absorpsiyon ve sekresyon için uygundur."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Cylindrical_Epithelium.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Epitel",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "epithelium",
    },
    {
        "title": "Korneal epitel",
        "description": "Gözün kornea yüzeyini örten stratifiye epitel; bariyer ve optik şeffaflık sağlar.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Corneal_epith%C3%A9lium.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Göz",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "epithelium",
    },
    {
        "title": "Bukkal mukoza — epitel hücreleri",
        "description": "Ağız mukozasından yassı epitel hücreleri; temel epitel morfolojisini gösterir.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/ef/Buccal_Epithelium_Cells.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Ağız",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "epithelium",
    },
    {
        "title": "Alveol duvarı — yassı epitel bağlamı",
        "description": (
            "Akciğer alveollerinde gaz değişimi bölgesi; ince yassı epitel ile uyumlu yapı. "
            "Basit skuamöz epitelin fonksiyonel örneği olarak incelenebilir."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Alveolar_wall.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Akciğer",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "epithelium",
    },
    {
        "title": "Epitel sınıflaması (şema)",
        "description": (
            "Epitel tiplerinin görsel özeti (İspanyolca etiketler). "
            "Basit/stratife ve hücre şekli sınıflandırmasını pekiştirmek için referans."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/51/Clasificaci%C3%B3n_del_tejido_epitelial.jpg",
        "specialty": "basic_sciences",
        "organ": "Epitel",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "epithelium",
    },
    {
        "title": "Adipoz doku",
        "description": (
            "Yağ hücreleri (adiposit) ve destekleyici bağ doku iskelesi. "
            "Enerji deposu, yalıtım ve dolgu görevi görür."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/a/a3/Adipose_tissue.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Bağ doku",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "connective_tissue",
    },
    {
        "title": "İskelet kası — kesit",
        "description": "Çizgili kas lifleri; çok çekirdekli, periferde yerleşen nükleuslar.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Skeletal_muscle.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Kas",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "muscle_tissue",
    },
    {
        "title": "Düz kas dokusu",
        "description": "Visseral organ duvarları ve damarların düz kası; involüner kasılma.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Smooth_muscle_tissue.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Kas",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "muscle_tissue",
    },
    {
        "title": "Kardiyak kas",
        "description": "Kalp kası; dallanan lifler ve interkalated diskler ile ayırt edilir.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/b/bd/Cardiac_muscle.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Kalp",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "muscle_tissue",
    },
    {
        "title": "Hyalin kıkırdak",
        "description": "Camımsı matriks ve kondrositler; eklem yüzleri ve solunum yollarında yaygındır.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/0f/Hyaline_cartilage.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Kıkırdak",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "cartilage_bone",
    },
    {
        "title": "Kemik dokusu — histoloji",
        "description": "Kompakt/spongiyöz kemik yapısına ait tipik H&E görünümü; osteosit ve lameller.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/07/Bone_histology.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Kemik",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "cartilage_bone",
    },
    {
        "title": "Nöron — ışık mikroskopisi",
        "description": "Nöron gövdesi ve çıkıntıları; sinir dokusunun temel birimini gösterir.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/8/86/Neuron_%28100x_magnification%29.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Sinir sistemi",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "nervous_tissue",
    },
    {
        "title": "İnsan kan yayması",
        "description": "Eritrosit, lökosit ve trombosit morfolojisi; periferik kan yayması temeli.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/a/a0/Blood_smear_%28265_21%29_Human.jpg",
        "specialty": "basic_sciences",
        "stain": "Wright-Giemsa",
        "organ": "Kan",
        "curriculum_track": "basic_cell_tissue",
        "science_unit": "blood",
    },
    {
        "title": "Lenf nodu — genel yapı",
        "description": "Lenfoid organ; B ve T hücre bölgeleri ve sinüsler (müfredatta lenfoid sistem).",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Lymph_node.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Lenfoid",
        "curriculum_track": "basic_organ_system",
        "science_unit": "lymphoid",
    },
    {
        "title": "Akciğer histolojisi",
        "description": "Solunum sistemine ait tipik alveoler mimari ve destek dokusu.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/08/Lung_histology.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Akciğer",
        "curriculum_track": "basic_organ_system",
        "science_unit": "respiratory",
    },
    {
        "title": "Duodenum mukozası",
        "description": "Bağırsak villusları ve bez yapıları; gastrointestinal sistem histolojisine giriş.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/8/8f/Duodenum_histology.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Bağırsak",
        "curriculum_track": "basic_organ_system",
        "science_unit": "digestive",
    },
    {
        "title": "Karaciğer dokusu (rezeksiyon materyali)",
        "description": "Karaciğer lobülü ve hepatosit plakaları; portal alanlar ile birlikte değerlendirilir.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/d/db/Histology_of_liver_tissue_from_a_gallbladder_resection.jpg",
        "specialty": "basic_sciences",
        "stain": "H&E",
        "organ": "Karaciğer",
        "curriculum_track": "basic_organ_system",
        "science_unit": "digestive",
    },
]

ALL_IMAGES = IMAGES + BASIC_CURRICULUM_IMAGES


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
        for data in ALL_IMAGES:
            if data["image_url"] in existing_urls:
                skipped += 1
                continue
            full = data["image_url"]
            thumb = data.get("thumbnail_url") or commons_thumb(full)
            payload = {
                "title": data["title"],
                "description": data.get("description"),
                "image_url": full,
                "thumbnail_url": thumb,
                "specialty": data.get("specialty"),
                "stain": data.get("stain"),
                "organ": data.get("organ"),
                "asset_source": data.get("asset_source", "wikimedia"),
                "curriculum_track": data.get("curriculum_track"),
                "science_unit": data.get("science_unit"),
            }
            img = HistologyImage(**payload)
            db.add(img)
            added += 1

        await db.commit()
        print(f"✓ {added} görüntü eklendi, {skipped} zaten mevcut.")


if __name__ == "__main__":
    asyncio.run(seed())
