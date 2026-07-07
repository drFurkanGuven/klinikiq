"""
App Store / Play Store inceleme hesabı oluşturur veya günceller.

Kullanım:
  cd backend
  python seed_reviewer.py

Ortam değişkenleri (isteğe bağlı):
  REVIEWER_EMAIL    (varsayılan: review@klinikiq.app)
  REVIEWER_PASSWORD (varsayılan: KlinikIQ-Review-2026!)
  REVIEWER_NAME     (varsayılan: App Review)
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import User

REVIEWER_EMAIL = os.getenv("REVIEWER_EMAIL", "review@klinikiq.app")
REVIEWER_PASSWORD = os.getenv("REVIEWER_PASSWORD", "KlinikIQ-Review-2026!")
REVIEWER_NAME = os.getenv("REVIEWER_NAME", "App Review")

# İsteğe bağlı ek hesaplar (virgülle)
EXTRA_REVIEWER_EMAILS = os.getenv("EXTRA_REVIEWER_EMAILS", "")


async def upsert_reviewer(db, email: str, name: str) -> str:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    password_hash = get_password_hash(REVIEWER_PASSWORD)

    if user:
        user.password_hash = password_hash
        user.name = name
        user.school = "KlinikIQ Demo"
        user.year = 6
        user.is_admin = False
        user.daily_limit = 50
        return "güncellendi"

    user = User(
        email=email,
        password_hash=password_hash,
        name=name,
        school="KlinikIQ Demo",
        year=6,
        is_admin=False,
        daily_limit=50,
    )
    db.add(user)
    return "oluşturuldu"


async def seed_reviewer() -> None:
    emails = [REVIEWER_EMAIL] + [
        e.strip() for e in EXTRA_REVIEWER_EMAILS.split(",") if e.strip()
    ]
    # Tekrarları kaldır, sırayı koru
    seen: set[str] = set()
    unique_emails: list[str] = []
    for e in emails:
        if e not in seen:
            seen.add(e)
            unique_emails.append(e)

    async with AsyncSessionLocal() as db:
        for i, email in enumerate(unique_emails):
            name = REVIEWER_NAME if i == 0 else f"App Review {i + 1}"
            action = await upsert_reviewer(db, email, name)
            print(f"Reviewer hesabı {action}:")
            print(f"  E-posta : {email}")
            print(f"  Şifre   : {REVIEWER_PASSWORD}")
            print()

        await db.commit()
        print("Bu bilgileri App Store Connect → App Review Information → Notes alanına ekleyin.")
        print("E-posta ve şifre birebir aynı olmalı; şifre boş bırakılırsa giriş 422 hatası verir.")


if __name__ == "__main__":
    asyncio.run(seed_reviewer())
