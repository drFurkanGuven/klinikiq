from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Any, Dict, Literal, Union
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


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


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


class UpdateProfile(BaseModel):
    name: Optional[str] = None
    school: Optional[str] = None
    year: Optional[int] = None


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
    opening_message: str = ""

    class Config:
        from_attributes = True


# ── Reports ───────────────────────────────────────────────────────────────────

class ClinicalReasoningOut(BaseModel):
    toplam_mesaj: int
    anamnez_sayisi: int
    tetkik_sayisi: int
    fizik_muayene_sayisi: int
    konsultasyon_sayisi: int
    ilk_eylem_oncesi_anamnez: int
    anamnez_yorum: str
    fizik_yorum: str


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
    clinical_reasoning: Optional[ClinicalReasoningOut] = None

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
    emergency_correct: int = 0  # acil MCQ'dan toplam doğru cevap sayısı

    class Config:
        from_attributes = True


class StudyNoteItem(BaseModel):
    session_id: str
    case_title: Optional[str] = "İsimsiz Vaka"
    specialty: Optional[str] = "Genel"
    missed_diagnoses: List[str] = []
    pathophysiology_note: Optional[str] = None
    tus_reference: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LearningCardOut(BaseModel):
    """Tamamlanan vaka raporlarından türetilen havuz özet kartı (vaka başına en güncel rapor)."""

    report_id: str
    case_id: str
    case_title: str
    specialty: str
    difficulty: str
    pathophysiology_note: Optional[str] = None
    tus_reference: Optional[str] = None
    score: float
    created_at: datetime


class LearningCardsPage(BaseModel):
    items: List[LearningCardOut]
    total: int
    limit: int
    offset: int


# ── TUS MCQ ───────────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: str
    case_id: str
    specialty: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: str
    # Doğru cevap ve açıklama sadece cevap gönderildikten sonra gelir
    correct_option: Optional[str] = None
    explanation: Optional[str] = None
    created_at: datetime
    user_answered: Optional[bool] = None       # Bu soruyu daha önce cevapladı mı?
    user_was_correct: Optional[bool] = None    # Doğru muydu?

    class Config:
        from_attributes = True


class QuestionAnswerSubmit(BaseModel):
    selected_option: str   # "A" / "B" / "C" / "D" / "E"


class QuestionAnswerResult(BaseModel):
    is_correct: bool
    correct_option: str
    explanation: str


class QuestionStatsOut(BaseModel):
    total_questions: int
    attempted: int
    correct: int
    incorrect: int
    correct_rate: float   # 0.0 - 1.0
    by_specialty: Dict[str, Any]


# ── Flashcards ────────────────────────────────────────────────────────────────

class FlashcardOut(BaseModel):
    id: str
    case_id: str
    specialty: str
    difficulty: str
    topic: str
    question: str
    answer: str
    key_points: List[str]
    tus_reference: Optional[str]
    created_at: datetime
    user_status: Optional[str] = "new"  # new / learning / known

    class Config:
        from_attributes = True


class FlashcardProgressUpdate(BaseModel):
    status: str  # "new" | "learning" | "known"


class FlashcardStatsOut(BaseModel):
    total: int
    new: int
    learning: int
    known: int


# ── Histology & Microscope ───────────────────────────────────────────────────

class HistologyImageCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    thumbnail_url: Optional[str] = None
    specialty: Optional[str] = None
    stain: Optional[str] = None
    organ: Optional[str] = None
    asset_source: Optional[str] = None
    curriculum_track: Optional[str] = None
    science_unit: Optional[str] = None


class HistologyImageOut(BaseModel):
    id: str
    case_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    image_url: str
    thumbnail_url: Optional[str] = None
    specialty: Optional[str] = None
    stain: Optional[str] = None
    organ: Optional[str] = None
    asset_source: Optional[str] = None
    curriculum_track: Optional[str] = None
    science_unit: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HistologyImagePatch(BaseModel):
    """Yönetim panelinde başlık / açıklama güncellemesi."""

    title: Optional[str] = None
    description: Optional[str] = None


class AnnotationCreate(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: Optional[str] = None
    note: str


class AnnotationOut(BaseModel):
    id: str
    image_id: str
    user_id: str
    x: float
    y: float
    width: float
    height: float
    label: Optional[str] = None
    note: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Farmakoloji Mantık Haritaları (curated statik JSON) ────────────────────────

class PharmaSignaling(BaseModel):
    pathway: str = ""
    second_messenger: str = ""
    clinical_hook_tr: str = ""


class PharmaNode(BaseModel):
    id: str
    label_tr: str
    type: Literal["receptor", "mediator", "organ", "effect", "drug_class"]
    description_tr: str = ""
    high_yield: bool = False
    memory_hook_tr: str = ""
    signaling: Optional[PharmaSignaling] = None


class PharmaEdge(BaseModel):
    source: str
    target: str
    relation: Literal["activates", "inhibits", "agonist", "antagonist"]
    effect_tr: str = ""
    # Yolak ağacı: bu kenar yalnızca belirtilen reseptör/mediator yolundayken gösterilir
    mediated_by: Optional[Union[str, List[str]]] = None


class PharmaDownstreamEffect(BaseModel):
    nodeId: str
    effect_tr: str = ""


class PharmaIntervention(BaseModel):
    drug_class: str
    label_tr: str
    targets: List[str] = []
    relation: Literal["agonist", "antagonist", "activates", "inhibits"]
    downstream_effects: List[PharmaDownstreamEffect] = []
    tr_products_atc: List[str] = []


class PharmaQuizItem(BaseModel):
    q_tr: str
    options_tr: List[str]
    answer_idx: int
    explanation_tr: str = ""
    node_id: Optional[str] = None


class PharmaVignette(BaseModel):
    id: str
    title_tr: str
    scenario_tr: str
    q_tr: str
    options_tr: List[str]
    answer_idx: int
    explanation_tr: str = ""
    node_id: Optional[str] = None


class PharmaMapSummary(BaseModel):
    id: str
    title_tr: str
    description_tr: str = ""
    order: int = 0
    level: str = "temel"
    estimated_minutes: int = 15
    prerequisites: List[str] = []
    high_yield_count: int = 0
    quiz_count: int = 0
    vignette_count: int = 0


class PharmaMapOut(BaseModel):
    id: str
    title_tr: str
    description_tr: str = ""
    source_attribution: str = ""
    nodes: List[PharmaNode] = []
    edges: List[PharmaEdge] = []
    interventions: List[PharmaIntervention] = []
    quiz: List[PharmaQuizItem] = []
    vignettes: List[PharmaVignette] = []


class PharmaLearningPathItem(BaseModel):
    map_id: str
    order: int
    level: str = "temel"
    estimated_minutes: int = 15
    prerequisites: List[str] = []


class PharmaLearningPathOut(BaseModel):
    title_tr: str
    description_tr: str = ""
    items: List[PharmaLearningPathItem] = []
