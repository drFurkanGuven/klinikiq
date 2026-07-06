"""FSRS kart zamanlama yardımcıları (py-fsrs v5+ Scheduler API)."""

from __future__ import annotations

from datetime import datetime, timezone

from fsrs import Card, Rating, Scheduler, State

from app.models.models import McqReviewCard, now_utc

_scheduler = Scheduler()


def rating_from_correct(was_correct: bool) -> Rating:
    return Rating.Good if was_correct else Rating.Again


def _db_state_to_fsrs(state_val: int) -> State:
    """Eski kayıtlar state=0 ile gelir; yeni API'de Learning=1."""
    if state_val <= 0:
        return State.Learning
    try:
        return State(state_val)
    except ValueError:
        return State.Learning


def card_to_fsrs(row: McqReviewCard) -> Card:
    return Card(
        state=_db_state_to_fsrs(int(row.state or 0)),
        stability=float(row.stability) if row.stability else None,
        difficulty=float(row.difficulty) if row.difficulty else None,
        due=row.due_at or now_utc(),
        last_review=row.last_review_at,
    )


def apply_fsrs_review(row: McqReviewCard, rating: Rating, reviewed_at: datetime | None = None) -> McqReviewCard:
    now = reviewed_at or now_utc()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    prior_last = row.last_review_at
    fsrs_card = card_to_fsrs(row)
    updated, _log = _scheduler.review_card(fsrs_card, rating, review_datetime=now)

    row.due_at = updated.due
    row.stability = float(updated.stability or 0)
    row.difficulty = float(updated.difficulty or 0)
    row.state = int(updated.state)
    row.last_review_at = now
    row.reps = int(row.reps or 0) + 1
    if rating == Rating.Again:
        row.lapses = int(row.lapses or 0) + 1

    if prior_last:
        elapsed = now - prior_last
        row.elapsed_days = max(0.0, elapsed.total_seconds() / 86400.0)
    else:
        row.elapsed_days = 0.0

    if updated.due:
        scheduled = updated.due - now
        row.scheduled_days = max(0.0, scheduled.total_seconds() / 86400.0)

    return row


def new_review_card(
    *,
    user_id: str,
    pool: str,
    mcq_id: str,
    topic_slug: str | None = None,
) -> McqReviewCard:
    card = Card()
    return McqReviewCard(
        user_id=user_id,
        pool=pool,
        mcq_id=mcq_id,
        topic_slug=topic_slug,
        stability=float(card.stability or 0),
        difficulty=float(card.difficulty or 0),
        due_at=card.due,
        reps=0,
        lapses=0,
        state=int(card.state),
        elapsed_days=0.0,
        scheduled_days=0.0,
        last_review_at=None,
    )
