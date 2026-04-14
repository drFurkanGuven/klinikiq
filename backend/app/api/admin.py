from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import User

router = APIRouter()

# ── Schemas ──
class UserAdminView(BaseModel):
    id: str
    name: str
    email: str
    school: str | None
    year: int | None
    is_admin: bool
    daily_limit: int

class UpdateLimitRequest(BaseModel):
    daily_limit: int

# ── Admin Dependency ──
async def get_current_admin_user(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler erişebilir")
    return user

# ── Endpoints ──
@router.get("/users", response_model=List[UserAdminView])
async def list_users(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Tüm kullanıcıları listele."""
    stmt = select(User).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/users/{target_id}/limit")
async def update_user_limit(
    target_id: str,
    req: UpdateLimitRequest,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının günlük limitini güncelle."""
    stmt = select(User).where(User.id == target_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    # [AİDER] Input validation: Limit negatif olamaz ve makul bir SINIRDA olmalı
    if req.daily_limit < 0 or req.daily_limit > 1000:
        raise HTTPException(status_code=400, detail="Geçersiz limit değeri (0-1000 arası olmalı)")

    # [AİDER] Audit Logging: Admin işlemini logla
    from datetime import datetime
    print(f"[AUDIT] {datetime.now()}: Admin {admin.email} (ID: {admin.id}) changed limit for {target_user.email} from {target_user.daily_limit} to {req.daily_limit}")

    target_user.daily_limit = req.daily_limit
    await db.commit()
    
    return {"message": "Limit başarıyla güncellendi", "new_limit": target_user.daily_limit}

@router.delete("/images/{image_id}", status_code=204)
async def admin_delete_image(
    image_id: str,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin panelinden histoloji görüntüsünü sil."""
    from app.models.models import HistologyImage
    import os, shutil
    from app.core.config import settings

    result = await db.execute(select(HistologyImage).where(HistologyImage.id == image_id))
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Görüntü bulunamadı")

    # Fiziksel dosyaları sil (yerel ise)
    if image.image_url and image.image_url.startswith("/tiles/"):
        filename = os.path.basename(image.image_url)
        name = os.path.splitext(filename)[0]
        
        dzi_path = os.path.join(settings.TILES_DIR, filename)
        files_path = os.path.join(settings.TILES_DIR, f"{name}_files")
        thumb_path = os.path.join(settings.TILES_DIR, f"{name}_thumb.jpg")
        
        try:
            if os.path.exists(dzi_path): os.remove(dzi_path)
            if os.path.exists(files_path): shutil.rmtree(files_path)
            if os.path.exists(thumb_path): os.remove(thumb_path)
        except Exception as e:
            print(f"Admin silme işlemi sırasında dosya silme hatası: {e}")

    await db.delete(image)
    await db.commit()
    return None
