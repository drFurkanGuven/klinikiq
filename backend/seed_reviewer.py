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


async def seed_reviewer() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == REVIEWER_EMAIL))
        user = result.scalar_one_or_none()
        password_hash = get_password_hash(REVIEWER_PASSWORD)

        if user:
            user.password_hash = password_hash
            user.name = REVIEWER_NAME
            user.school = "KlinikIQ Demo"
            user.year = 6
            user.is_admin = False
            user.daily_limit = 50
            action = "güncellendi"
        else:
            user = User(
                email=REVIEWER_EMAIL,
                password_hash=password_hash,
                name=REVIEWER_NAME,
                school="KlinikIQ Demo",
                year=6,
                is_admin=False,
                daily_limit=50,
            )
            db.add(user)
            action = "oluşturuldu"

        await db.commit()
        print(f"Reviewer hesabı {action}:")
        print(f"  E-posta : {REVIEWER_EMAIL}")
        print(f"  Şifre   : {REVIEWER_PASSWORD}")
        print("Bu bilgileri App Store Connect Review Notes alanına ekleyin.")


if __name__ == "__main__":
    asyncio.run(seed_reviewer())
