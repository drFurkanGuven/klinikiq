"""
Eksik Vital Bulguları Doldur — Tek Seferlik Migration Scripti

Kullanım:
  cd backend
  python generate_missing_vitals.py              # tüm eksikler
  python generate_missing_vitals.py --dry-run    # sadece sayım, DB'ye yazmaz
  python generate_missing_vitals.py --limit 100  # ilk 100 vakayı işle
"""
import asyncio
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from openai import AsyncOpenAI
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.config import settings
from app.models.models import Case

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_vitals(hidden_diagnosis: str, age: int, gender: str, chief_complaint: str) -> dict:
    """GPT-4o ile tanıya uygun gerçekçi vital bulgular üretir."""
    prompt = f"""Bir tıp simülasyon platformu için hasta vital bulgularını üret.

Hasta Bilgileri:
- Yaş: {age}
- Cinsiyet: {gender}
- Baş Yakınma: {chief_complaint}
- Gizli Tanı: {hidden_diagnosis}

Bu hastanın acil/poliklinik kabulünde ölçülen vital bulgularını üret.
Değerler gizli tanıyla klinik olarak TUTARLI olsun (örn: pnömoni → hafif ateş, taşikardi; miyokard enfarktüsü → hipertansiyon, taşikardi).

Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir şey ekleme:
{{
  "KB": "120/80 mmHg",
  "Nabız": "78/dk",
  "Solunum": "16/dk",
  "Ateş": "36.8°C",
  "SpO2": "%98"
}}"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen tıp simülasyonu için gerçekçi vital bulgular üreten bir asistansın. Sadece geçerli JSON döndür."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=150,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        print(f"    GPT hatası: {e}")
        return {}


async def main(dry_run: bool = False, limit: int = 0):
    print("=" * 60)
    print("Eksik Vital Bulguları Doldur — Migration Scripti")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # Vitals alanı boş veya eksik olan vakaları bul
        result = await db.execute(
            select(Case).where(Case.is_active == True)
        )
        all_cases = result.scalars().all()

    # Vitals eksik olanları filtrele
    missing = []
    for case in all_cases:
        pj = case.patient_json or {}
        vitals = pj.get("vitals")
        if not vitals or not isinstance(vitals, dict) or len(vitals) == 0:
            missing.append(case)

    print(f"\nToplam aktif vaka   : {len(all_cases)}")
    print(f"Vitals eksik vaka  : {len(missing)}")

    if not missing:
        print("\n✓ Tüm vakalarda vitals mevcut, işlem gerekmiyor.")
        return

    if limit > 0:
        missing = missing[:limit]
        print(f"(--limit ile ilk {limit} vaka işlenecek)")

    if dry_run:
        print("\n[DRY RUN] Gerçek güncelleme yapılmayacak.")
        for i, case in enumerate(missing[:5], 1):
            pj = case.patient_json or {}
            print(f"  {i}. {case.id[:8]}... | {pj.get('age')}y {pj.get('gender')} | {pj.get('chief_complaint', '')[:50]}")
        if len(missing) > 5:
            print(f"  ... ve {len(missing) - 5} tane daha")
        return

    print(f"\n{len(missing)} vaka güncellenecek. Başlanıyor...\n")
    success = 0
    failed = 0

    for i, case in enumerate(missing, 1):
        pj = dict(case.patient_json or {})
        age = pj.get("age", 40)
        gender = pj.get("gender", "bilinmiyor")
        complaint = pj.get("chief_complaint", "genel şikayet")
        diagnosis = case.hidden_diagnosis or "bilinmeyen tanı"

        print(f"[{i}/{len(missing)}] {case.id[:8]}... | {age}y {gender} | {complaint[:40]}")

        vitals = await generate_vitals(diagnosis, age, gender, complaint)
        if not vitals:
            print(f"    ✗ Vitals üretilemedi, atlanıyor")
            failed += 1
            continue

        pj["vitals"] = vitals
        print(f"    ✓ {vitals}")

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Case).where(Case.id == case.id))
            db_case = result.scalar_one()
            db_case.patient_json = pj
            await db.commit()

        success += 1

        # API rate limit için küçük bekleme
        if i % 10 == 0:
            await asyncio.sleep(1)

    print("\n" + "=" * 60)
    print(f"Tamamlandı: {success} başarılı, {failed} başarısız")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Eksik vital bulguları GPT ile doldur")
    parser.add_argument("--dry-run", action="store_true", help="DB'ye yazmadan sadece say")
    parser.add_argument("--limit", type=int, default=0, help="Kaç vaka işlensin (0=hepsi)")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))
