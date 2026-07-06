"""FSRS-5 kart zamanlama yardımcıları."""

from __future__ import annotations

from datetime import datetime, timezone

from fsrs import Card, FSRS, Rating, State

from app.models.models import McqReviewCard, now_utc

_fsrs = FSRS()


def rating_from_correct(was_correct: bool) -> Rating:
    return Rating.Good if was_correct else Rating.Again


def card_to_fsrs(row: McqReviewCard) -> Card:
    state_val = int(row.state or 0)
    try:
        state = State(state_val)
    except ValueError:
        state = State.New
    return Card(
        due=row.due_at or now_utc(),
        stability=float(row.stability or 0),
        difficulty=float(row.difficulty or 0),
        elapsed_days=float(row.elapsed_days or 0),
        scheduled_days=float(row.scheduled_days or 0),
        reps=int(row.reps or 0),
        lapses=int(row.lapses or 0),
        state=state,
    )


def apply_fsrs_review(row: McqReviewCard, rating: Rating, reviewed_at: datetime | None = None) -> McqReviewCard:
    now = reviewed_at or now_utc()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    fsrs_card = card_to_fsrs(row)
    scheduling = _fsrs.repeat(fsrs_card, now)
    updated = scheduling[rating].card
    row.due_at = updated.due
    row.stability = float(updated.stability)
    row.difficulty = float(updated.difficulty)
    row.elapsed_days = float(updated.elapsed_days)
    row.scheduled_days = float(updated.scheduled_days)
    row.reps = int(updated.reps)
    row.lapses = int(updated.lapses)
    row.state = int(updated.state)
    row.last_review_at = now
    return row


def new_review_card(
    *,
    user_id: str,
    pool: str,
    mcq_id: str,
    topic_slug: str | None = None,
) -> McqReviewCard:
    now = now_utc()
    card = Card()
    return McqReviewCard(
        user_id=user_id,
        pool=pool,
        mcq_id=mcq_id,
        topic_slug=topic_slug,
        stability=float(card.stability),
        difficulty=float(card.difficulty),
        due_at=card.due,
        reps=int(card.reps),
        lapses=int(card.lapses),
        state=int(card.state),
        elapsed_days=float(card.elapsed_days),
        scheduled_days=float(card.scheduled_days),
        last_review_at=None,
    )
