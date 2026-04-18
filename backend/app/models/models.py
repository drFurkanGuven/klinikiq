from datetime import datetime, timezone
from typing import Optional, Any
import uuid

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Enum as SAEnum, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY
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


class FlashcardStatus(str, enum.Enum):
    new = "new"
    learning = "learning"
    known = "known"


class Specialty(str, enum.Enum):
    pathology = "pathology"
    nephrology = "nephrology"
    pulmonology = "pulmonology"
    neurology = "neurology"
    cardiology = "cardiology"
    hematology = "hematology"
    gastroenterology = "gastroenterology"
    dermatology = "dermatology"
    other = "other"


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
    emergency_mcq_reports = relationship("EmergencyMcqReport", back_populates="user")
    community_notes = relationship("CommunityNote", back_populates="user")
    community_note_attachments = relationship(
        "CommunityNoteAttachment", back_populates="user"
    )


class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    specialty = Column(String, nullable=False, index=True)  # cardiology, nephrology...
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


class EmergencyMcqReport(Base):
    """Acil MCQ çok soruluk oturum özeti (klasik vaka Report kaydından ayrı tablo)."""

    __tablename__ = "emergency_mcq_reports"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    correct_count = Column(Integer, nullable=False)
    total_count = Column(Integer, nullable=False)
    detail = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, index=True)

    user = relationship("User", back_populates="emergency_mcq_reports")


class TetkikResult(Base):
    """Vaka bazlı tetkik sonuçları cache tablosu.
    Aynı vaka için aynı test kombinasyonu tekrar istenirse AI'a gidilmez.
    """
    __tablename__ = "tetkik_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    test_key = Column(String, nullable=False)   # sıralı, normalize test isimleri: "crp|hemogram|..."
    result_content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        UniqueConstraint("case_id", "test_key", name="uq_tetkik_case_testkey"),
    )


class Flashcard(Base):
    """Vaka bazlı ortak flashcard havuzu. İlk vaka bitişinde AI üretir, herkes kullanır."""
    __tablename__ = "flashcards"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, unique=True)
    specialty = Column(String, nullable=False, index=True)
    difficulty = Column(String, nullable=False, index=True)
    topic = Column(String, nullable=False)           # AI'ın belirlediği konu adı
    question = Column(Text, nullable=False)          # Klinik senaryo sorusu
    answer = Column(Text, nullable=False)            # Tanı + patofizyoloji
    key_points = Column(JSONB, nullable=False, default=list)  # 3-5 madde
    tus_reference = Column(Text, nullable=True)
    source_report_id = Column(String, ForeignKey("reports.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    progress = relationship("FlashcardProgress", back_populates="flashcard")


class FlashcardProgress(Base):
    """Kullanıcı başına flashcard ilerleme takibi."""
    __tablename__ = "flashcard_progress"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    flashcard_id = Column(String, ForeignKey("flashcards.id"), nullable=False)
    status = Column(SAEnum(FlashcardStatus), default=FlashcardStatus.new, nullable=False)
    times_seen = Column(Integer, default=0, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    flashcard = relationship("Flashcard", back_populates="progress")

    __table_args__ = (
        UniqueConstraint("user_id", "flashcard_id", name="uq_flashcard_progress"),
    )


class CaseQuestion(Base):
    """Vaka bazlı TUS MCQ soru bankası. İlk tamamlamada AI üretir, herkes kullanır."""
    __tablename__ = "case_questions"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    specialty = Column(String, nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    option_e = Column(String, nullable=False)
    correct_option = Column(String, nullable=False)   # "A" / "B" / "C" / "D" / "E"
    explanation = Column(Text, nullable=False)
    source_report_id = Column(String, ForeignKey("reports.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    attempts = relationship("QuestionAttempt", back_populates="question")


class QuestionAttempt(Base):
    """Kullanıcı başına soru cevaplama geçmişi."""
    __tablename__ = "question_attempts"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("case_questions.id"), nullable=False)
    selected_option = Column(String, nullable=False)  # "A"-"E"
    is_correct = Column(Boolean, nullable=False)
    attempted_at = Column(DateTime(timezone=True), default=now_utc)

    question = relationship("CaseQuestion", back_populates="attempts")


class HistologyImage(Base):
    """Yüksek çözünürlüklü histoloji/patoloji görüntüleri."""
    __tablename__ = "histology_images"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=False)  # DZI dosyası veya dış URL
    thumbnail_url = Column(String, nullable=True)
    specialty = Column(String, nullable=True, index=True)
    # Örn. H&E, PAS, trichrome — filtre ve kart etiketi için
    stain = Column(String, nullable=True, index=True)
    # Örn. böbrek, meme, akciğer
    organ = Column(String, nullable=True, index=True)
    # wikimedia | huggingface | upload
    asset_source = Column(String, nullable=True, index=True)
    # Temel histoloji müfredatı (Histology Guide tarzı) vs klinik branş
    # clinical | basic_cell_tissue | basic_organ_system — NULL eski kayıtlar için klinik kabul edilir
    curriculum_track = Column(String, nullable=True, index=True)
    # Örn. epithelium, muscle_tissue, respiratory — filtre etiketi
    science_unit = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class CommunityNote(Base):
    """Topluluk not akışı — TUS sınıflandırması (temel/klinik + dal + konu)."""

    __tablename__ = "community_notes"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tus_group = Column(String, nullable=False, index=True)  # temel | klinik
    branch_id = Column(String(80), nullable=False, index=True)
    topic_id = Column(String(80), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    # pending → yönetici onayı bekliyor | published → akışta | rejected → reddedildi (yazar görür)
    moderation_status = Column(
        String(20),
        nullable=False,
        default="published",
        server_default="published",
        index=True,
    )
    created_at = Column(DateTime(timezone=True), default=now_utc, index=True)

    user = relationship("User", back_populates="community_notes")
    attachments = relationship(
        "CommunityNoteAttachment",
        back_populates="note",
        cascade="all, delete-orphan",
    )


class CommunityNoteAttachment(Base):
    """Not eki — PDF veya görsel; diskte kullanıcı/not klasöründe saklanır."""

    __tablename__ = "community_note_attachments"

    id = Column(String, primary_key=True, default=gen_uuid)
    note_id = Column(
        String,
        ForeignKey("community_notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(16), nullable=False)  # image | pdf
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(120), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    # Örn. /uploads/community-notes/{user_id}/{note_id}/{id}.pdf
    public_path = Column(String(512), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, index=True)

    note = relationship("CommunityNote", back_populates="attachments")
    user = relationship("User", back_populates="community_note_attachments")

    __table_args__ = (Index("ix_cna_note_created", "note_id", "created_at"),)


class CommunityNoteLike(Base):
    """Not beğenileri — her kullanıcı bir notu en fazla bir kez beğenir (toggle)."""

    __tablename__ = "community_note_likes"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    note_id = Column(String, ForeignKey("community_notes.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (Index("ix_cn_like_note", "note_id"),)


class CommunityNoteSave(Base):
    """Kişisel kayıtlar — kullanıcı notu kaydeder; başkaları görmez."""

    __tablename__ = "community_note_saves"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    note_id = Column(String, ForeignKey("community_notes.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (Index("ix_cn_save_user", "user_id"), Index("ix_cn_save_note", "note_id"))


class Annotation(Base):
    """Kullanıcıların görüntüler üzerindeki etiketleme notları."""
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, default=gen_uuid)
    image_id = Column(String, ForeignKey("histology_images.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    label = Column(String, nullable=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class Drug(Base):
    """DrugBank open data (import_drugbank.py) — TİTCK proxy yerine."""

    __tablename__ = "drugs"

    drugbank_id = Column(String, primary_key=True)  # DB00001
    name = Column(String, nullable=False, index=True)
    drug_type = Column(String)  # small molecule / biotech
    groups = Column(String)  # approved, investigational...
    description = Column(Text)
    indication = Column(Text)
    mechanism = Column(Text)
    pharmacodynamics = Column(Text)
    toxicity = Column(Text)
    metabolism = Column(Text)
    absorption = Column(Text)
    half_life = Column(Text)
    protein_binding = Column(Text)
    route_of_elimination = Column(Text)
    volume_of_distribution = Column(Text)
    drug_interactions = Column(Text)  # boşlukla ayrılmış DrugBank ID listesi
    food_interactions = Column(Text)
    targets = Column(Text)
    atc_codes = Column(Text)  # full text: "BLOOD AND BLOOD FORMING..."
    average_mass = Column(String)


class AntibioticSpectrum(Base):
    """CARD / antibiyotik spektrumu — DrugBank ile soft join (drugbank_id FK değil)."""

    __tablename__ = "antibiotic_spectrum"

    id = Column(Integer, primary_key=True, autoincrement=True)
    drugbank_id = Column(String, index=True)  # drugs tablosuyla soft join
    antibiotic_name = Column(String, nullable=False, index=True)
    organism = Column(String, nullable=False, index=True)
    resistance_mechanism = Column(Text)
    aro_accession = Column(String)
    amr_gene_family = Column(Text)
    drug_class = Column(String)
