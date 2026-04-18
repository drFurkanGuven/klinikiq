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

## Not

Tıbbi ürünlerde içerik **mutlaka** klinik doğruluk ve hukuk açısından gözden geçirilmelidir; bu pipeline yalnızca veri toplama ve biçimlendirme sağlar.
