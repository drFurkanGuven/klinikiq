from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import CaseQuestion, QuestionAttempt
from app.schemas.schemas import QuestionOut, QuestionAnswerSubmit, QuestionAnswerResult, QuestionStatsOut

router = APIRouter()


def _to_question_out(q: CaseQuestion, attempt: QuestionAttempt | None, reveal: bool = False) -> QuestionOut:
    return QuestionOut(
        id=q.id,
        case_id=q.case_id,
        specialty=q.specialty,
        question_text=q.question_text,
        option_a=q.option_a,
        option_b=q.option_b,
        option_c=q.option_c,
        option_d=q.option_d,
        option_e=q.option_e,
        correct_option=q.correct_option if reveal else None,
        explanation=q.explanation if reveal else None,
        created_at=q.created_at,
        user_answered=attempt is not None,
        user_was_correct=attempt.is_correct if attempt else None,
    )


@router.get("", response_model=list[QuestionOut])
async def list_questions(
    specialty: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Tüm soru bankasını listele (cevaplar gizli)."""
    query = select(CaseQuestion)
    if specialty:
        query = query.where(cast(CaseQuestion.specialty, String) == specialty)
    query = query.order_by(CaseQuestion.created_at.desc())

    result = await db.execute(query)
    questions = result.scalars().all()

    q_ids = [q.id for q in questions]
    attempts_result = await db.execute(
        select(QuestionAttempt).where(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.question_id.in_(q_ids),
        )
    )
    attempt_map = {a.question_id: a for a in attempts_result.scalars().all()}

    return [_to_question_out(q, attempt_map.get(q.id), reveal=False) for q in questions]


@router.get("/stats", response_model=QuestionStatsOut)
async def get_question_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Kullanıcının MCQ istatistiği."""
    total_result = await db.execute(select(func.count(CaseQuestion.id)))
    total = total_result.scalar() or 0

    attempts_result = await db.execute(
        select(QuestionAttempt).where(QuestionAttempt.user_id == user_id)
    )
    attempts = attempts_result.scalars().all()

    correct = sum(1 for a in attempts if a.is_correct)
    incorrect = len(attempts) - correct

    # Branş bazlı istatistik
    from sqlalchemy import cast, String
    specialty_result = await db.execute(
        select(cast(CaseQuestion.specialty, String), func.count(QuestionAttempt.id), func.sum(QuestionAttempt.is_correct.cast(func.Integer)))
        .join(QuestionAttempt, QuestionAttempt.question_id == CaseQuestion.id)
        .where(QuestionAttempt.user_id == user_id)
        .group_by(cast(CaseQuestion.specialty, String))
    )
    by_specialty = {}
    for specialty, count, correct_count in specialty_result.all():
        by_specialty[specialty] = {
            "attempted": count,
            "correct": int(correct_count or 0),
            "rate": round((correct_count or 0) / count, 2) if count else 0,
        }

    return QuestionStatsOut(
        total_questions=total,
        attempted=len(attempts),
        correct=correct,
        incorrect=incorrect,
        correct_rate=round(correct / len(attempts), 2) if attempts else 0.0,
        by_specialty=by_specialty,
    )


@router.get("/practice", response_model=list[QuestionOut])
async def get_practice_questions(
    specialty: str | None = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Cevaplanmamış sorular önce gelecek şekilde pratik kuyruğu döner."""
    query = select(CaseQuestion)
    if specialty:
        query = query.where(cast(CaseQuestion.specialty, String) == specialty)

    result = await db.execute(query)
    questions = result.scalars().all()

    q_ids = [q.id for q in questions]
    attempts_result = await db.execute(
        select(QuestionAttempt).where(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.question_id.in_(q_ids),
        )
    )
    attempt_map = {a.question_id: a for a in attempts_result.scalars().all()}

    # Cevaplanmamışlar önce, yanlışlar sonra, doğrular en sona
    def sort_key(q):
        a = attempt_map.get(q.id)
        if a is None:
            return 0          # cevaplanmamış
        if not a.is_correct:
            return 1          # yanlış → tekrar
        return 2              # doğru → sona

    questions_sorted = sorted(questions, key=sort_key)[:limit]
    return [_to_question_out(q, attempt_map.get(q.id), reveal=False) for q in questions_sorted]


@router.get("/{question_id}", response_model=QuestionOut)
async def get_question(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Tek soru — daha önce cevaplandıysa cevap da gösterilir."""
    result = await db.execute(select(CaseQuestion).where(CaseQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")

    attempt_result = await db.execute(
        select(QuestionAttempt).where(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.question_id == question_id,
        )
    )
    attempt = attempt_result.scalar_one_or_none()
    return _to_question_out(q, attempt, reveal=attempt is not None)


@router.post("/{question_id}/answer", response_model=QuestionAnswerResult)
async def answer_question(
    question_id: str,
    data: QuestionAnswerSubmit,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Soruyu cevapla — doğru cevap ve açıklama döner. Tekrar cevaplanabilir."""
    if data.selected_option.upper() not in ("A", "B", "C", "D", "E"):
        raise HTTPException(status_code=400, detail="Geçersiz şık. A/B/C/D/E olmalı")

    result = await db.execute(select(CaseQuestion).where(CaseQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")

    is_correct = data.selected_option.upper() == q.correct_option.upper()

    attempt = QuestionAttempt(
        user_id=user_id,
        question_id=question_id,
        selected_option=data.selected_option.upper(),
        is_correct=is_correct,
    )
    db.add(attempt)
    await db.commit()

    return QuestionAnswerResult(
        is_correct=is_correct,
        correct_option=q.correct_option,
        explanation=q.explanation,
    )
