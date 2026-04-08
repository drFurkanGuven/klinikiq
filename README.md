# 🩺 KlinikIQ: Next-Gen Medical Simulation Platform
<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Engine-Active-orange?style=for-the-badge" />
</p>

---

### 🌟 Vizyon & Misyon
**KlinikIQ**, tıp eğitimini interaktif ve oyunlaştırılmış bir boyuta taşıyan yüksek sadakatli bir simülasyon motorudur. 10.000'den fazla vaka ile desteklenen bu platform, hekim adaylarının klinik karar verme süreçlerini (Clinical Reasoning) güvenli bir ortamda test etmelerini sağlar.

---

### 🛠️ Veri Hattı & CLI Araçları (Adım Adım Kılavuz)
KlinikIQ'ya kendi vaka setlerinizi yüklemek veya MedQA verilerini işlemek için aşağıdaki araçları kullanabilirsiniz. Bu araçlar projenin kalbindeki veri işleme mutfağını oluşturur:

#### 1️⃣ Vaka Dönüştürme (`convert_medqa.py`)
MedQA formatındaki ham JSONL dosyalarını KlinikIQ'nun tetkik ve muayene modülleriyle uyumlu hale getirir.
```bash
# Kullanım örneği:
python convert_medqa.py --input ham_veriler.jsonl --output cases_ready.jsonl
```
*Bu araç vakanın içindeki şikayet, geçmiş ve tetkik verilerini parse ederek simülasyon objesine dönüştürür.*

#### 2️⃣ Veritabanı Aktarımı (`import_cases.py`)
Hazır olan vaka dosyalarınızı PostgreSQL veritabanına aktarmak için kullanılır. 
```bash
# Kullanım örneği:
python import_cases.py --input cases_ready.jsonl
```
* **UUID Üretimi:** Her vakaya eşsiz bir kimlik atar.
* **Spoiler Koruması:** Vaka başlıklarını (Örn: "Akut MI") otomatik olarak maskeler ("Gizemli Kardiyoloji Vakası #A1B2").

---

### ✨ Temel Özellikler
*   **The Randomizer:** Binlerce vaka içinden branş (Kardiyoloji, Nöroloji, vb.) ve zorluk derecesine göre akıllı seçim.
*   **Akıllı Hasta Personası:** Yapay zeka destekli (Modelden bağımsız kurgulanabilir), anlık reaksiyon veren hasta görüşmeleri.
*   **Gelişmiş LIS (Tetkik) Modülü:** Gerçekçi laboratuvar panelleri (Hemogram, Biyokimya, Seroloji) ve interaktif fizik muayene.
*   **Admin & Maliyet Paneli:** Günlük vaka limitleri, kullanıcı yönetimi ve API bütçe kontrolü.

---

### 📦 Teknoloji Yığını
Platform modern ve hafif (lightweight) bir mimari ile her türlü sunucuya hızlıca kurulabilir:
*   **Backend:** FastAPI (Python) & SQLAlchemy
*   **Frontend:** Next.js 14 (App Router) & Tailwind CSS
*   **Database:** PostgreSQL & Redis (Cache)
*   **Deployment:** Docker & Docker Compose & Nginx

---

### 🚥 Kurulum (Setup)
Projeyi Docker üzerinden saniyeler içinde ayağa kaldırabilirsiniz:
```bash
git clone https://github.com/drFurkanGuven/klinikiq.git
cd klinikiq
docker-compose up -d --build
```
> **Not:** `.env` dosyasını oluşturmayı ve gerekli API anahtarlarınızı girmeyi unutmayın.

---

<div align="center">
  <p><small>Tıp dünyasına katkı sağlamak amacıyla <b>Furkan Güven</b> tarafından geliştirilmiştir.</small></p>
  <img src="https://img.shields.io/badge/Made%20with-Love%20for%20Medicine-red?style=flat-square" />
</div>
