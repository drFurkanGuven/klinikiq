from datetime import datetime, timezone
from typing import Optional, Any
import uuid

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


def gen_uuid():
    return str(uuid.uuid4())


# ── Enums ─────────────────────────────────────────────────────────────────────

class SessionStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    school = Column(String, nullable=True)
    year = Column(Integer, nullable=True)  # kaçıncı sınıf
    is_admin = Column(Boolean, default=False, nullable=False)
    daily_limit = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    sessions = relationship("SimulationSession", back_populates="user")


class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    specialty = Column(String, nullable=False, index=True)  # cardiology, endocrinology...
    difficulty = Column(String, nullable=False, index=True)  # easy, medium, hard
    patient_json = Column(JSONB, nullable=False)
    # patient_json örnek: {name, age, gender, chief_complaint, history, vitals}
    # hidden_diagnosis bu alanda GİZLİ → ayrı kolona alındı
    hidden_diagnosis = Column(String, nullable=False)
    scoring_rubric = Column(JSONB, nullable=False)
    # scoring_rubric: {primary_diagnosis, differential_diagnoses[], key_findings[], point_weights{}}
    educational_notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    sessions = relationship("SimulationSession", back_populates="case")


class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    status = Column(SAEnum(SessionStatus), default=SessionStatus.active, nullable=False)
    started_at = Column(DateTime(timezone=True), default=now_utc)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")
    case = relationship("Case", back_populates="sessions")
    messages = relationship("Message", back_populates="session", order_by="Message.created_at")
    diagnoses = relationship("DiagnosisSubmitted", back_populates="session")
    report = relationship("Report", back_populates="session", uselist=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), nullable=False)
    role = Column(SAEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    session = relationship("SimulationSession", back_populates="messages")


class DiagnosisSubmitted(Base):
    __tablename__ = "diagnoses_submitted"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), nullable=False)
    diagnosis_text = Column(String, nullable=False)
    rank = Column(Integer, nullable=False)  # 1=birincil, 2=ikincil...

    session = relationship("SimulationSession", back_populates="diagnoses")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("simulation_sessions.id"), unique=True, nullable=False)
    score = Column(Float, nullable=False)  # 0-100
    correct_diagnoses = Column(JSONB, nullable=False, default=list)
    missed_diagnoses = Column(JSONB, nullable=False, default=list)
    pathophysiology_note = Column(Text, nullable=True)
    tus_reference = Column(Text, nullable=True)
    recommendations = Column(JSONB, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    session = relationship("SimulationSession", back_populates="report")
