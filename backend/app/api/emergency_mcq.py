"""
MedQA/PubMed acil alt kümesi (unified_emergency.jsonl) — rastgele MCQ pratiği.
Veri: backend/scripts/medical_qa_dataset + fetch_normalize_filter.py çıktısı.
"""

from __future__ import annotations

import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import EmergencyMcqReport
from app.services.emergency_ai_service import (
    generate_emergency_session_report,
    generate_patient_time_urge,
    openai_configured,
    stream_emergency_tutor,
)

router = APIRouter()

_POOL: list[dict[str, Any]] | None = None
_BY_ID: dict[str, dict[str, Any]] | None = None


def _jsonl_path() -> Path:
    raw = (os.environ.get("MEDICAL_QA_EMERGENCY_JSONL") or "").strip()
    if raw:
        p = Path(raw)
        return p if p.is_absolute() else (Path(__file__).resolve().parents[2] / p).resolve()
    return (Path(__file__).resolve().parents[2] / "data" / "medical_qa" / "emergency" / "unified_emergency.jsonl").resolve()


def _load_pool() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    global _POOL, _BY_ID
    if _POOL is not None and _BY_ID is not None:
        return _POOL, _BY_ID
    path = _jsonl_path()
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Acil soru verisi yok: {path}. "
                "Sunucuda `backend/scripts/medical_qa_dataset` içinde fetch_normalize_filter.py çalıştırın."
            ),
        )
    pool: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj.get("question_type") != "mcq_four":
                continue
            oid = str(obj.get("id") or "")
            if not oid:
                continue
            pool.append(obj)
            by_id[oid] = obj
    if not pool:
        raise HTTPException(
            status_code=503,
            detail="Acil veri dosyasında mcq_four sorusu yok.",
        )
    _POOL = pool
    _BY_ID = by_id
    return _POOL, _BY_ID


class EmergencyMcqOptionOut(BaseModel):
    label: str
    text: str


class EmergencyMcqRandomOut(BaseModel):
    id: str
    question: str
    options: list[EmergencyMcqOptionOut]
    source: str
    emergency_score: int | None = None


class EmergencyMcqVerifyIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=256)
    selected_label: str = Field(..., min_length=1, max_length=8)


class EmergencyMcqVerifyOut(BaseModel):
    correct: bool
    correct_label: str | None
    correct_answer_text: str | None


class EmergencyMcqStatsOut(BaseModel):
    path: str
    mcq_count: int
    total_jsonl_lines: int
    openai_configured: bool = False


class EmergencyMcqChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=12000)


class EmergencyMcqChatIn(BaseModel):
    """Son kullanıcı mesajı dahil kısa sohbet geçmişi (istemci tutar)."""
    id: str = Field(..., min_length=1, max_length=256)
    messages: list[EmergencyMcqChatMessage] = Field(..., min_length=1, max_length=30)


class PatientUrgeIn(BaseModel):
    """Kalan süre eşiğinde otomatik hasta çıkışı (süre azalınca)."""
    id: str = Field(..., min_length=1, max_length=256)
    remaining_sec: int = Field(ge=0, le=86400)
    elapsed_sec: int = Field(ge=0, le=86400)
    phase: Literal["120", "60"]


class PatientUrgeOut(BaseModel):
    message: str
    skipped: bool = False


class EmergencyMcqReportItemIn(BaseModel):
    question_id: str = Field(..., min_length=1, max_length=256)
    question_preview: str = Field(..., min_length=1, max_length=4000)
    correct: bool
    elapsed_sec: int | None = Field(None, ge=0, le=86400)
    selected_label: str | None = Field(None, max_length=8)


class EmergencyMcqReportCreateIn(BaseModel):
    """Bu oturumda çözülen sorular + AI sohbeti + simüle hasta çıkışları."""

    items: list[EmergencyMcqReportItemIn] = Field(..., min_length=1, max_length=80)
    ai_messages: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    patient_urges: list[str] = Field(default_factory=list, max_length=40)


class EmergencyMcqReportOut(BaseModel):
    id: str
    score: float
    correct_count: int
    total_count: int
    strengths: list[str]
    gaps: list[str]
    recommendations: list[str]
    overview_note: str | None = None
    tus_reference: str | None = None
    time_management_note: str | None = None
    ai_chat_note: str | None = None
    patient_urge_note: str | None = None
    created_at: datetime


class EmergencyMcqReportListItem(BaseModel):
    id: str
    score: float
    correct_count: int
    total_count: int
    created_at: datetime


def _report_row_to_out(row: EmergencyMcqReport) -> EmergencyMcqReportOut:
    d = row.detail if isinstance(row.detail, dict) else {}
    return EmergencyMcqReportOut(
        id=row.id,
        score=row.score,
        correct_count=row.correct_count,
        total_count=row.total_count,
        strengths=list(d.get("strengths") or []),
        gaps=list(d.get("gaps") or []),
        recommendations=list(d.get("recommendations") or []),
        overview_note=d.get("overview_note"),
        tus_reference=d.get("tus_reference"),
        time_management_note=d.get("time_management_note"),
        ai_chat_note=d.get("ai_chat_note"),
        patient_urge_note=d.get("patient_urge_note"),
        created_at=row.created_at,
    )


def _sanitize_ai_messages(raw: list[dict[str, Any]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for m in raw[:80]:
        if not isinstance(m, dict):
            continue
        role = str(m.get("role", "")).strip()
        content = str(m.get("content", ""))[:12000]
        if role in ("user", "assistant") and content.strip():
            out.append({"role": role, "content": content})
    return out


@router.get("/stats", response_model=EmergencyMcqStatsOut)
async def emergency_mcq_stats(_user_id: str = Depends(get_current_user_id)):
    """Kaç MCQ yüklendiğini döner (dosya varsa)."""
    path = _jsonl_path()
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Veri dosyası yok: {path}",
        )
    pool, _ = _load_pool()
    # total lines (all types) for transparency
    total_lines = 0
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                total_lines += 1
    return EmergencyMcqStatsOut(
        path=str(path),
        mcq_count=len(pool),
        total_jsonl_lines=total_lines,
        openai_configured=openai_configured(),
    )


@router.get("/random", response_model=EmergencyMcqRandomOut)
async def emergency_mcq_random(_user_id: str = Depends(get_current_user_id)):
    """Rastgele bir acil odaklı çoktan seçmeli soru (doğru cevap dönmez)."""
    pool, _ = _load_pool()
    item = random.choice(pool)
    opts = item.get("options") or []
    options_out: list[EmergencyMcqOptionOut] = []
    if isinstance(opts, list):
        for o in opts:
            if isinstance(o, dict) and o.get("label") and o.get("text") is not None:
                options_out.append(EmergencyMcqOptionOut(label=str(o["label"]), text=str(o["text"])))
    fm = item.get("filter_meta")
    score = None
    if isinstance(fm, dict) and isinstance(fm.get("emergency_score"), int):
        score = fm["emergency_score"]
    return EmergencyMcqRandomOut(
        id=str(item["id"]),
        question=str(item.get("question") or ""),
        options=options_out,
        source=str(item.get("source") or ""),
        emergency_score=score,
    )


@router.post("/verify", response_model=EmergencyMcqVerifyOut)
async def emergency_mcq_verify(body: EmergencyMcqVerifyIn, _user_id: str = Depends(get_current_user_id)):
    """Seçilen şıkkı doğrular."""
    _, by_id = _load_pool()
    item = by_id.get(body.id)
    if not item:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    correct_label = str(item.get("correct_option_label") or "").strip().upper()
    sel = body.selected_label.strip().upper()
    ok = bool(correct_label) and sel == correct_label
    return EmergencyMcqVerifyOut(
        correct=ok,
        correct_label=correct_label or None,
        correct_answer_text=str(item.get("correct_answer_text") or "") or None,
    )


@router.post("/chat")
async def emergency_mcq_chat(
    body: EmergencyMcqChatIn,
    _user_id: str = Depends(get_current_user_id),
):
    """Acil MCQ için AI asistan (SSE). Normal vaka oturumlarından bağımsızdır."""
    _, by_id = _load_pool()
    item = by_id.get(body.id)
    if not item:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")

    msgs = [{"role": m.role, "content": m.content} for m in body.messages]

    async def event_generator():
        async for chunk in stream_emergency_tutor(item, msgs):
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/patient-urge", response_model=PatientUrgeOut)
async def emergency_mcq_patient_urge(
    body: PatientUrgeIn,
    _user_id: str = Depends(get_current_user_id),
):
    """Süre azalınca vinyete uygun hasta cümlesi (OpenAI)."""
    _, by_id = _load_pool()
    item = by_id.get(body.id)
    if not item:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    if not openai_configured():
        return PatientUrgeOut(message="", skipped=True)
    text = await generate_patient_time_urge(
        item,
        body.phase,
        remaining_sec=body.remaining_sec,
        elapsed_sec=body.elapsed_sec,
    )
    return PatientUrgeOut(message=text, skipped=False)


@router.post("/reports", response_model=EmergencyMcqReportOut)
async def emergency_mcq_create_report(
    body: EmergencyMcqReportCreateIn,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Çok soruluk acil MCQ oturumu için rapor üretir ve kullanıcıya kaydeder (vaka Report'tan bağımsız)."""
    items_dict = [m.model_dump() for m in body.items]
    msgs = _sanitize_ai_messages(body.ai_messages)
    urges = [str(u)[:800] for u in body.patient_urges[:40]]

    report_data = await generate_emergency_session_report(items_dict, msgs, urges)
    correct_count = sum(1 for x in body.items if x.correct)
    total_count = len(body.items)

    detail: dict[str, Any] = {
        **report_data,
        "items_snapshot": items_dict,
        "ai_message_count": len(msgs),
    }
    row = EmergencyMcqReport(
        user_id=user_id,
        score=float(report_data["score"]),
        correct_count=correct_count,
        total_count=total_count,
        detail=detail,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _report_row_to_out(row)


@router.get("/reports", response_model=list[EmergencyMcqReportListItem])
async def emergency_mcq_list_reports(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(30, ge=1, le=100),
):
    result = await db.execute(
        select(EmergencyMcqReport)
        .where(EmergencyMcqReport.user_id == user_id)
        .order_by(EmergencyMcqReport.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        EmergencyMcqReportListItem(
            id=r.id,
            score=r.score,
            correct_count=r.correct_count,
            total_count=r.total_count,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/reports/{report_id}", response_model=EmergencyMcqReportOut)
async def emergency_mcq_get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(EmergencyMcqReport).where(
            EmergencyMcqReport.id == report_id,
            EmergencyMcqReport.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı.")
    return _report_row_to_out(row)
