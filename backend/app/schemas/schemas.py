from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    school: Optional[str] = None
    year: Optional[int] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    school: Optional[str]
    year: Optional[int]
    is_admin: bool
    daily_limit: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Cases ─────────────────────────────────────────────────────────────────────

class CaseListItem(BaseModel):
    id: str
    title: str
    specialty: str
    difficulty: str
    # patient_json'dan sadece public alanlar
    chief_complaint: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class CaseDetail(BaseModel):
    id: str
    title: str
    specialty: str
    difficulty: str
    patient_json: Dict[str, Any]  # hidden_diagnosis alanı çıkarılmış
    educational_notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Sessions ──────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    case_id: str


class MessageCreate(BaseModel):
    content: str


class DiagnoseSubmit(BaseModel):
    diagnoses: List[str] = Field(min_length=1, max_length=5)


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: str
    case_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: str
    session_id: str
    score: float
    correct_diagnoses: List[str]
    missed_diagnoses: List[str]
    pathophysiology_note: Optional[str]
    tus_reference: Optional[str]
    recommendations: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryItem(BaseModel):
    session_id: str
    case_title: str
    specialty: str
    difficulty: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    score: Optional[float]

    class Config:
        from_attributes = True


# ── Users & Leaderboard & Study Notes ─────────────────────────────────────────

class LeaderboardItem(BaseModel):
    name: str # Masked name
    school: Optional[str]
    year: Optional[int]
    total_cases: int
    average_score: float
    total_score: float
    
    class Config:
        from_attributes = True


class StudyNoteItem(BaseModel):
    session_id: str
    case_title: str
    specialty: str
    missed_diagnoses: List[str]
    pathophysiology_note: Optional[str]
    tus_reference: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
