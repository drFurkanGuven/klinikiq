# 🩺 KlinikIQ: AI-Powered Medical Simulation Platform

[![Build Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)](https://klinikiq.furkanguven.space)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Deployment-Docker-2496ED?style=for-the-badge&logo=docker)](https://docker.com)

**KlinikIQ**, tıp öğrencileri ve hekimler için tasarlanmış, yapay zeka destekli interaktif bir vaka simülasyon platformudur. 10.000'den fazla USMLE tabanlı vaka ile zenginleştirilmiş bu ekosistem, kullanıcıların klinik karar verme yeteneklerini güvenli bir ortamda geliştirmelerini sağlar.

---

## ✨ Temel Özellikler

### 🤖 Çift Kanallı AI Mimarisi
- **Hasta Personası:** GPT-4o-mini tarafından yönetilen, şikayetlerini ve geçmişini gerçekçi şekilde aktaran "Hasta" modeli.
- **Sistem/Konsültasyon Modeli:** GPT-4o tarafından yönetilen, tetkikleri yorumlayan ve simülasyon sonunda detaylı klinik rapor sunan "Hoca" modeli.

### 🧪 Gelişmiş LIS (Laboratuvar Bilgi Sistemi)
- Gerçekçi laboratuvar sonuçları üretimi.
- Romatoloji, Diyabet Otoantikor, Viral Seroloji ve daha fazlasını içeren zengin tetkik panelleri.
- İnteraktif fizik muayene modülü (Kardiyovasküler, Nörolojik, Batın muayenesi vb.).

### 🎲 Akıllı Vaka Seçici (The Randomizer)
- **10.000+ USMLE Vakası:** MedQA veri setinden dönüştürülmüş devasa kütüphane.
- **Gelişmiş Filtreleme:** Uzmanlık alanına (Kardiyoloji, Nöroloji, vb.) ve zorluk derecesine göre seçim.
- **Anti-Farming Mekanizması:** Kullanıcının daha önce çözdüğü vakaları filtreleyen eşsiz vaka algoritması.

### 🔐 Yönetim ve Maliyet Kontrolü
- **Admin Paneli:** Kullanıcı yönetimi, günlük vaka limiti belirleme ve API maliyet kontrolü.
- **Maliyet Optimizasyonu:** Model izolasyonu ve verimli prompt yönetimi ile sürdürülebilir AI kullanımı.

---

## 🛠️ Teknoloji Yığını

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Lucide Icons.
- **Backend:** FastAPI, SQLAlchemy (Async), Pydantic.
- **Database & Cache:** PostgreSQL (JSONB desteği), Redis.
- **Infrastructure:** Docker & Docker Compose, Nginx (Reverse Proxy), Certbot (SSL).

---

## 🚀 Hızlı Kurulum (Development)

Projeyi yerel makinenizde çalıştırmak için:

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/drFurkanGuven/klinikiq.git
   cd klinikiq
   ```

2. `.env` dosyasını oluşturun:
   ```bash
   cp .env.example .env
   # OPENAI_API_KEY ve DATABASE_URL alanlarını doldurun
   ```

3. Docker ile sistemi ateşleyin:
   ```bash
   docker-compose up -d --build
   ```

4. Tarayıcınızda açın: `http://localhost:3000`

---

## 🛡️ Üretim (Production) Mimarisi

KlinikIQ, Fedora Linux sunucularda Dockerize edilmiş bir yapıda çalışacak şekilde optimize edilmiştir. Nginx 8080 portu üzerinden ana sunucudaki Nginx ile köprü kurarak (Reverse Proxy) diğer servislerle çakışmadan stabil yayın yapar.

---

## 📄 Lisans

Bu proje Furkan Güven tarafından tıbbi eğitim amaçlı geliştirilmiştir. Tüm hakları saklıdır.

---

> **Not:** Bu platform tıbbi eğitim amaçlı bir simülasyon aracıdır. AI tarafından üretilen veriler gerçek klinik tanılar yerine geçmez.

Developed with ❤️ for the medical community.
