# MedQA-USMLE + PubMedQA — indirme, şema, acil filtresi

Bu klasör, **resmi Hugging Face yansıları** üzerinden veriyi indirir, **Klinikiq birleşik JSON şemasına** dönüştürür ve **acil odaklı** (anahtar kelime) alt küme üretir.

## Hızlı başlangıç

Önce **proje köküne** gidin (burada `backend/` klasörü görünür). Başka bir dizindeyseniz `cd backend/scripts/...` çalışmaz.

```bash
# Örnek: proje /opt/klinikiq altındaysa
cd /opt/klinikiq

# Doğrulama: bu komut dosyayı göstermeli
ls backend/scripts/medical_qa_dataset/fetch_normalize_filter.py

cd backend/scripts/medical_qa_dataset
python3 -m pip install -r requirements.txt
python3 fetch_normalize_filter.py
```

Tek satır (mutlak yol, `/opt/klinikiq` için):

```bash
python3 -m pip install -r /opt/klinikiq/backend/scripts/medical_qa_dataset/requirements.txt
python3 /opt/klinikiq/backend/scripts/medical_qa_dataset/fetch_normalize_filter.py
```

Varsayılan çıktı: proje içinde `backend/data/medical_qa/`

## Uygulama entegrasyonu

Backend, çoktan seçmeli acil soruları **`unified_emergency.jsonl`** içinden okur (varsayılan yol: `backend/data/medical_qa/emergency/unified_emergency.jsonl`). Farklı bir yol için ortam değişkeni:

`MEDICAL_QA_EMERGENCY_JSONL=/tam/yol/unified_emergency.jsonl`

API: `GET /api/emergency-mcq/stats`, `GET /api/emergency-mcq/random`, `POST /api/emergency-mcq/verify`  
Frontend: **Simülasyon → Acil** (`/simulasyon` → `/simulasyon/acil`). Eski URL `/farmakoloji/acil-mcq` → `/simulasyon/acil` yönlendirir.

## Çıktı yapısı

| Dosya / klasör | Açıklama |
|------------------|----------|
| `raw/*.jsonl` | Tüm normalize kayıtlar (train/test ayrımı korunur) |
| `emergency/*_emergency.jsonl` | Acil anahtar kelime filtresinden geçenler |
| `emergency/unified_emergency.jsonl` | İki kaynağın birleşik acil alt kümesi |
| `stats.json` | Satır sayıları özeti |
| `schema/klinikiq_emergency_item.schema.json` | JSON Schema |
| `licenses/` | Depo lisans metinleri + `SOURCES.md` (atıf linkleri) |

## Kaynaklar

- **MedQA-USMLE (4 şık):** [GBaker/MedQA-USMLE-4-options](https://huggingface.co/datasets/GBaker/MedQA-USMLE-4-options) — orijinal çalışma [arXiv:2009.13081](https://arxiv.org/abs/2009.13081), ham arşiv [jind11/MedQA](https://github.com/jind11/MedQA).
- **PubMedQA (pqa_labeled):** [qiaojin/PubMedQA](https://huggingface.co/datasets/qiaojin/PubMedQA) — [pubmedqa.github.io](https://pubmedqa.github.io/).

Ayrıntılı lisans notları: `licenses/SOURCES.md`.

## Acil filtre (v2)

- **Ağırlıklı puan:** “yüksek özgüllük” (ör. STEMI, PE, triyaj) 2 puan, geniş terimler (ör. akut, travma) 1 puan.
- **MedQA:** toplam puan eşiği + tek başına yeterli güçlü sinyaller (ör. `stemi`, `cardiac_arrest`).
- **PubMedQA:** önce **temel bilim / model organizma** gürültüsü elenir (zebrafish, bitki, saf in vitro vb.); ardından **klinik bağlam** (patient, year-old, hospitalized, ED…) + puan eşiği veya çok yüksek acil puanı.

Yine de **tüm acil vakaları yakalamaz**; üretimde LLM/etiket ile doğrulama önerilir.

## Türkçe çeviri (acil MCQ)

`unified_emergency.jsonl` üretildikten sonra, satırlara `question_tr` / `options_tr` eklemek için:

```bash
cd backend/scripts/medical_qa_dataset
python3 -m pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
# Önce 3 satırla dene:
python3 translate_emergency_mcq.py \
  --in ../../data/medical_qa/emergency/unified_emergency.jsonl \
  --out ../../data/medical_qa/emergency/unified_emergency_tr.jsonl \
  --limit 3

# Tüm havuz (uzun sürer, maliyetli):
python3 translate_emergency_mcq.py \
  --in ../../data/medical_qa/emergency/unified_emergency.jsonl \
  --out ../../data/medical_qa/emergency/unified_emergency_tr.jsonl
```

- **`--force`:** `question_tr` olsa bile yeniden çevir.
- Çıktı dosyasını kullanmak için backend’de `MEDICAL_QA_EMERGENCY_JSONL` yolunu bu dosyaya ayarlayın veya dosyayı `unified_emergency.jsonl` adıyla değiştirin.

API: `GET /api/emergency-mcq/random?lang=tr` — çeviri yoksa metin İngilizce kalır.  
Frontend (Acil simülasyon): **TR / EN** seçici + `Yeni soru` bir sonraki soruda seçilen dili kullanır.

### Uzun çeviride takip (nohup / log)

- `stdout` dosyaya yönlendirilmediyse çıktı çalışma dizinindeki **`nohup.out`** içinde olabilir: `tail -f nohup.out`
- **`--progress /tam/yol/translate.progress`** kullanın; her adım bu dosyaya yazılır: `tail -f /tam/yol/translate.progress`
- Süreç hangi dizinde: `pwdx $(pgrep -f translate_emergency_mcq)`

## Not

Tıbbi ürünlerde içerik **mutlaka** klinik doğruluk ve hukuk açısından gözden geçirilmelidir; bu pipeline yalnızca veri toplama ve biçimlendirme sağlar. Otomatik çeviriler için örneklemle insan kontrolü önerilir.
