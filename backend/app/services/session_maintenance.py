from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import SimulationSession, SessionStatus


AUTO_ABANDON_HOURS = 72


async def abandon_stale_active_sessions(
    db: AsyncSession,
    user_id: Optional[str] = None,
) -> int:
    """Mark old active sessions as abandoned and return affected row count."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=AUTO_ABANDON_HOURS)
    now = datetime.now(timezone.utc)

    stmt = (
        update(SimulationSession)
        .where(SimulationSession.status == SessionStatus.active)
        .where(SimulationSession.started_at < cutoff)
        .values(status=SessionStatus.abandoned, ended_at=now)
    )
    if user_id:
        stmt = stmt.where(SimulationSession.user_id == user_id)

    result = await db.execute(stmt)
    await db.commit()
    return int(result.rowcount or 0)
