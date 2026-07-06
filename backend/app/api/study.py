"""
Günlük çalışma API — FSRS tekrar kuyruğu + TR acil MCQ oturumları.
"""

from __future__ import annotations

import math
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import (
    McqReviewCard,
    McqReviewLog,
    UserStudySettings,
    UserStudyStreak,
    now_utc,
)
from app.services.fsrs_study import apply_fsrs_review, new_review_card, rating_from_correct
from app.services.mcq_pools import (
    get_pool_item,
    load_emergency_pool,
    load_usmle_pool,
    mcq_options_display,
    mcq_question_display,
    verify_mcq_answer,
)
from app.services.topic_classifier import (
    all_topics,
    classify_topic,
    remediation_for_topic,
    topic_label,
)

router = APIRouter()

POOL_DAILY = "emergency_tr"
POOL_USMLE = "practice_usmle"
StudyMode = Literal["daily", "acil", "usmle"]
VALID_GOALS = {5, 10, 20}


# ── Schemas ───────────────────────────────────────────────────────────────────


class StudySettingsOut(BaseModel):
    daily_goal: int
    preferred_pool: str


class StudySettingsPatch(BaseModel):
    daily_goal: int | None = Field(None, ge=5, le=50)


class WeakTopicOut(BaseModel):
    topic_slug: str
    topic_label: str
    wrong_count: int
    total_count: int


class StudyDashboardOut(BaseModel):
    daily_goal: int
    answered_today: int
    due_count: int
    current_streak: int
    longest_streak: int
    pool_mcq_count: int
    weak_topics: list[WeakTopicOut]


class McqOptionOut(BaseModel):
    label: str
    text: str


class StudyQuestionOut(BaseModel):
    mcq_id: str
    pool: str
    question: str
    options: list[McqOptionOut]
    is_review: bool
    topic_slug: str | None = None
    topic_label: str | None = None


class SessionStartIn(BaseModel):
    goal: int = Field(10, ge=5, le=50)
    mode: StudyMode = "daily"


class SessionStartOut(BaseModel):
    session_id: str
    mode: StudyMode
    goal: int
    questions: list[StudyQuestionOut]


class RemediationOut(BaseModel):
    topic_slug: str
    topic_label: str
    map_href: str | None = None


class SessionAnswerIn(BaseModel):
    mcq_id: str = Field(..., min_length=1, max_length=256)
    pool: str = Field(..., min_length=1, max_length=32)
    selected_label: str = Field(..., min_length=1, max_length=8)
    session_id: str | None = None
    elapsed_ms: int | None = Field(None, ge=0, le=600_000)


class SessionAnswerOut(BaseModel):
    correct: bool
    correct_label: str | None
    correct_answer_text: str | None
    remediation: RemediationOut | None = None
    due_count: int
    answered_today: int


class TopicMasteryOut(BaseModel):
    topic_slug: str
    topic_label: str
    seen: int
    correct: int
    mastery_pct: float
    map_href: str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _get_or_create_settings(db: AsyncSession, user_id: str) -> UserStudySettings:
    result = await db.execute(
        select(UserStudySettings).where(UserStudySettings.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    row = UserStudySettings(user_id=user_id, daily_goal=10, preferred_pool=POOL_DAILY)
    db.add(row)
    await db.flush()
    return row


async def _get_or_create_streak(db: AsyncSession, user_id: str) -> UserStudyStreak:
    result = await db.execute(
        select(UserStudyStreak).where(UserStudyStreak.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    row = UserStudyStreak(user_id=user_id, current_streak=0, longest_streak=0)
    db.add(row)
    await db.flush()
    return row


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


async def _answered_today_count(db: AsyncSession, user_id: str) -> int:
    today = _utc_today()
    start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    result = await db.execute(
        select(func.count(McqReviewLog.id)).where(
            McqReviewLog.user_id == user_id,
            McqReviewLog.reviewed_at >= start,
            McqReviewLog.reviewed_at < end,
        )
    )
    return int(result.scalar() or 0)


async def _due_count(db: AsyncSession, user_id: str, pool: str) -> int:
    now = now_utc()
    result = await db.execute(
        select(func.count(McqReviewCard.id)).where(
            McqReviewCard.user_id == user_id,
            McqReviewCard.pool == pool,
            McqReviewCard.due_at <= now,
            McqReviewCard.reps > 0,
        )
    )
    return int(result.scalar() or 0)


async def _update_streak(db: AsyncSession, streak: UserStudyStreak) -> None:
    today = _utc_today()
    if streak.last_study_date == today:
        return
    if streak.last_study_date == today - timedelta(days=1):
        streak.current_streak = int(streak.current_streak or 0) + 1
    else:
        streak.current_streak = 1
    streak.last_study_date = today
    streak.longest_streak = max(int(streak.longest_streak or 0), streak.current_streak)
    streak.updated_at = now_utc()


async def _weak_topics(db: AsyncSession, user_id: str, days: int = 7) -> list[WeakTopicOut]:
    since = now_utc() - timedelta(days=days)
    result = await db.execute(
        select(
            McqReviewLog.topic_slug,
            func.count(McqReviewLog.id).label("total"),
            func.sum(case((McqReviewLog.was_correct.is_(False), 1), else_=0)).label("wrong"),
        )
        .where(
            McqReviewLog.user_id == user_id,
            McqReviewLog.reviewed_at >= since,
            McqReviewLog.topic_slug.isnot(None),
        )
        .group_by(McqReviewLog.topic_slug)
    )
    rows = result.all()
    weak: list[WeakTopicOut] = []
    for slug, total, wrong in rows:
        if not slug:
            continue
        total_i = int(total or 0)
        wrong_i = int(wrong or 0)
        if total_i < 2 or wrong_i == 0:
            continue
        weak.append(
            WeakTopicOut(
                topic_slug=str(slug),
                topic_label=topic_label(str(slug)) or str(slug),
                wrong_count=wrong_i,
                total_count=total_i,
            )
        )
    weak.sort(key=lambda x: x.wrong_count / max(x.total_count, 1), reverse=True)
    return weak[:5]


def _item_to_question_out(
    item: dict[str, Any],
    *,
    pool: str,
    lang: str,
    is_review: bool,
    topic_slug: str | None,
) -> StudyQuestionOut:
    opts = mcq_options_display(item, lang)
    options_out: list[McqOptionOut] = []
    for o in opts:
        if isinstance(o, dict) and o.get("label") and o.get("text") is not None:
            options_out.append(McqOptionOut(label=str(o["label"]), text=str(o["text"])))
    slug = topic_slug or classify_topic(item)
    return StudyQuestionOut(
        mcq_id=str(item["id"]),
        pool=pool,
        question=mcq_question_display(item, lang),
        options=options_out,
        is_review=is_review,
        topic_slug=slug,
        topic_label=topic_label(slug) if slug else None,
    )


def _pool_for_mode(mode: StudyMode) -> tuple[str, str]:
    if mode == "usmle":
        return POOL_USMLE, "en"
    return POOL_DAILY, "tr"


async def _build_session_questions(
    db: AsyncSession,
    user_id: str,
    goal: int,
    mode: StudyMode,
) -> list[StudyQuestionOut]:
    pool_name, lang = _pool_for_mode(mode)
    if pool_name == POOL_DAILY:
        pool, _ = load_emergency_pool(tr_only=True)
    else:
        pool, _ = load_usmle_pool()

    now = now_utc()
    due_n = min(math.ceil(goal * 0.3), goal) if mode == "daily" else 0

    due_result = await db.execute(
        select(McqReviewCard)
        .where(
            McqReviewCard.user_id == user_id,
            McqReviewCard.pool == pool_name,
            McqReviewCard.due_at <= now,
            McqReviewCard.reps > 0,
        )
        .order_by(McqReviewCard.due_at.asc())
        .limit(due_n * 3)
    )
    due_cards = list(due_result.scalars().all())
    random.shuffle(due_cards)
    due_cards = due_cards[:due_n]

    seen_ids_result = await db.execute(
        select(McqReviewCard.mcq_id).where(
            McqReviewCard.user_id == user_id,
            McqReviewCard.pool == pool_name,
        )
    )
    seen_ids = {str(x) for x in seen_ids_result.scalars().all()}
    due_ids = {c.mcq_id for c in due_cards}

    new_candidates = [item for item in pool if str(item["id"]) not in seen_ids and str(item["id"]) not in due_ids]
    random.shuffle(new_candidates)
    need_new = goal - len(due_cards)
    new_items = new_candidates[: max(0, need_new)]

    if len(due_cards) + len(new_items) < goal:
        extra_pool = [item for item in pool if str(item["id"]) not in due_ids]
        random.shuffle(extra_pool)
        for item in extra_pool:
            if len(due_cards) + len(new_items) >= goal:
                break
            if str(item["id"]) in {q.mcq_id for q in due_cards}:
                continue
            if str(item["id"]) in {str(i["id"]) for i in new_items}:
                continue
            new_items.append(item)

    questions: list[StudyQuestionOut] = []
    for card in due_cards:
        item = get_pool_item(pool_name, card.mcq_id)
        if item:
            questions.append(
                _item_to_question_out(
                    item,
                    pool=pool_name,
                    lang=lang,
                    is_review=True,
                    topic_slug=card.topic_slug,
                )
            )
    for item in new_items:
        slug = classify_topic(item)
        questions.append(
            _item_to_question_out(
                item,
                pool=pool_name,
                lang=lang,
                is_review=False,
                topic_slug=slug,
            )
        )
    random.shuffle(questions)
    return questions[:goal]


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("/dashboard", response_model=StudyDashboardOut)
async def study_dashboard(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    settings = await _get_or_create_settings(db, user_id)
    streak = await _get_or_create_streak(db, user_id)
    await db.commit()

    try:
        pool, _ = load_emergency_pool(tr_only=True)
        pool_count = len(pool)
    except HTTPException:
        pool_count = 0

    weak = await _weak_topics(db, user_id)
    due = await _due_count(db, user_id, POOL_DAILY)
    answered = await _answered_today_count(db, user_id)

    return StudyDashboardOut(
        daily_goal=settings.daily_goal,
        answered_today=answered,
        due_count=due,
        current_streak=int(streak.current_streak or 0),
        longest_streak=int(streak.longest_streak or 0),
        pool_mcq_count=pool_count,
        weak_topics=weak,
    )


@router.patch("/settings", response_model=StudySettingsOut)
async def study_settings_patch(
    body: StudySettingsPatch,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    settings = await _get_or_create_settings(db, user_id)
    if body.daily_goal is not None:
        if body.daily_goal not in VALID_GOALS:
            raise HTTPException(status_code=400, detail="daily_goal 5, 10 veya 20 olmalıdır.")
        settings.daily_goal = body.daily_goal
    settings.updated_at = now_utc()
    await db.commit()
    await db.refresh(settings)
    return StudySettingsOut(
        daily_goal=settings.daily_goal,
        preferred_pool=settings.preferred_pool,
    )


@router.post("/session/start", response_model=SessionStartOut)
async def session_start(
    body: SessionStartIn,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if body.goal not in VALID_GOALS:
        raise HTTPException(status_code=400, detail="goal 5, 10 veya 20 olmalıdır.")
    settings = await _get_or_create_settings(db, user_id)
    goal = body.goal
    if body.mode == "daily":
        goal = body.goal or settings.daily_goal

    questions = await _build_session_questions(db, user_id, goal, body.mode)
    if not questions:
        raise HTTPException(status_code=503, detail="Oturum için yeterli soru bulunamadı.")

    return SessionStartOut(
        session_id=str(uuid.uuid4()),
        mode=body.mode,
        goal=goal,
        questions=questions,
    )


@router.post("/session/answer", response_model=SessionAnswerOut)
async def session_answer(
    body: SessionAnswerIn,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    item = get_pool_item(body.pool, body.mcq_id)
    if not item:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")

    correct, correct_label, correct_text = verify_mcq_answer(item, body.selected_label)
    topic_slug = classify_topic(item)
    rating = rating_from_correct(correct)
    rating_int = int(rating)

    result = await db.execute(
        select(McqReviewCard).where(
            McqReviewCard.user_id == user_id,
            McqReviewCard.pool == body.pool,
            McqReviewCard.mcq_id == body.mcq_id,
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        card = new_review_card(
            user_id=user_id,
            pool=body.pool,
            mcq_id=body.mcq_id,
            topic_slug=topic_slug,
        )
        db.add(card)
        await db.flush()

    if card.topic_slug is None and topic_slug:
        card.topic_slug = topic_slug

    apply_fsrs_review(card, rating)

    log = McqReviewLog(
        user_id=user_id,
        card_id=card.id,
        pool=body.pool,
        mcq_id=body.mcq_id,
        topic_slug=card.topic_slug,
        rating=rating_int,
        was_correct=correct,
        elapsed_ms=body.elapsed_ms,
    )
    db.add(log)

    streak = await _get_or_create_streak(db, user_id)
    await _update_streak(db, streak)

    await db.commit()

    remediation_out: RemediationOut | None = None
    if not correct:
        rem = remediation_for_topic(card.topic_slug or topic_slug)
        if rem:
            remediation_out = RemediationOut(
                topic_slug=rem["topic_slug"],
                topic_label=rem["topic_label"],
                map_href=rem.get("map_href"),
            )

    due = await _due_count(db, user_id, body.pool)
    answered = await _answered_today_count(db, user_id)

    return SessionAnswerOut(
        correct=correct,
        correct_label=correct_label,
        correct_answer_text=correct_text,
        remediation=remediation_out,
        due_count=due,
        answered_today=answered,
    )


@router.get("/topics", response_model=list[TopicMasteryOut])
async def study_topics(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(
            McqReviewLog.topic_slug,
            func.count(McqReviewLog.id).label("seen"),
            func.sum(case((McqReviewLog.was_correct.is_(True), 1), else_=0)).label("correct"),
        )
        .where(
            McqReviewLog.user_id == user_id,
            McqReviewLog.topic_slug.isnot(None),
        )
        .group_by(McqReviewLog.topic_slug)
    )

    stats_by_slug: dict[str, tuple[int, int]] = {}
    for slug, seen, correct in result.all():
        if slug:
            stats_by_slug[str(slug)] = (int(seen or 0), int(correct or 0))

    out: list[TopicMasteryOut] = []
    for topic in all_topics():
        slug = str(topic.get("topic_slug") or "")
        if not slug:
            continue
        seen, correct = stats_by_slug.get(slug, (0, 0))
        mastery = round(100.0 * correct / seen, 1) if seen > 0 else 0.0
        rem = remediation_for_topic(slug)
        out.append(
            TopicMasteryOut(
                topic_slug=slug,
                topic_label=str(topic.get("label_tr") or slug),
                seen=seen,
                correct=correct,
                mastery_pct=mastery,
                map_href=rem.get("map_href") if rem else None,
            )
        )
    out.sort(key=lambda x: (-x.seen, x.topic_label))
    return out
