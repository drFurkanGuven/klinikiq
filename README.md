# 🩺 KlinikIQ
> **Next-Gen Medical Simulation Engine**  
> *10,000+ interactive USMLE-based clinical cases.*

<div align="center">
  <img src="https://img.shields.io/badge/Status-v1.0.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-success?style=flat-square" />
  <img src="https://img.shields.io/badge/Engine-Active-orange?style=flat-square" />
</div>

---

### 🚀 Overview
KlinikIQ, tıp eğitimi için tasarlanmış yüksek sadakatli bir simülasyon motorudur. GPT-4o entegrasyonu ile "akıllı hasta" personası yaratır ve karmaşık laboratuvar sonuçlarını gerçek zamanlı işler.

### 🛠️ Data Pipeline & CLI Tools
Platformun kalbinde yatan veri araçları:

- **`convert_medqa.py`**: Ham MedQA JSONL veri setlerini KlinikIQ'nun anlayacağı gelişmiş "Case" formatına dönüştürür.
- **`import_cases.py`**: Dönüştürülmüş vakaları PostgreSQL'e aktarır; UUID üretimini sağlar ve vaka başlıklarındaki tanı ipuçlarını otomatik maskeler.

### 🔑 Key Features
*   **The Randomizer:** Daha önce çözmediğiniz 10k+ vaka arasından branş bazlı rastgele vaka çekimi.
*   **AI Personas:** ChatGPT destekli reaktif hasta görüşmeleri.
*   **LIS Module:** Gelişmiş tetkik panelleri ve fizik muayene simülasyonu.
*   **Admin Panel:** Kullanıcı limiti ve API maliyet yönetimi.

### 📦 Stack
*   **Backend:** FastAPI / PostgreSQL / Redis
*   **Frontend:** Next.js / Tailwind CSS / Lucide
*   **Infrastructure:** Docker Compose / Nginx / Certbot

---

### 🚥 Setup
```bash
# Clone & Start
git clone https://github.com/drFurkanGuven/klinikiq.git
docker-compose up -d --build
```
*Note: Datasets are restricted. You must provide your own case files for local deployment.*

---
<p align="center">
  <small>Developed by <b>Furkan Güven</b> • 2026</small>
</p>
