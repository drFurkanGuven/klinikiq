import axios from "axios";
import { storage } from "./storage";

export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    const isAndroid = (window as any).Capacitor?.getPlatform() === "android";
    const isCapacitorOrigin = window.location.protocol === "capacitor:";
    if (isAndroid || isCapacitorOrigin) return "http://10.0.2.2:8000/api";
  }

  return "http://localhost:8000/api";
};

export const API_URL = getBaseUrl();

// ── API Instance ─────────────────────────────────────────────────────────────
export const api = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30s — ağır SSE dışı tüm istekler için güvenlik ağı
});

// Dinamik Base URL + Token Interceptor
api.interceptors.request.use(async (config) => {
  try {
    await storage.waitForInit(); // max 5s bekler, hata olsa da devam eder
  } catch {
    // waitForInit hiçbir zaman throw etmemeli, ama yine de koruma
  }
  config.baseURL = getBaseUrl();
  const token = storage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = storage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(`${getBaseUrl()}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccessToken = res.data.access_token;
        await storage.setItem("access_token", newAccessToken);
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch {
        await storage.clearAuthTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Typed API calls ──────────────────────────────────────────────────────────

export interface Case {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  chief_complaint?: string;
  patient_age?: number;
  patient_gender?: string;
  is_active: boolean;
}

export interface CaseDetail {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  patient_json: Record<string, any>;
  educational_notes?: string;
}

export interface SessionOut {
  id: string;
  case_id: string;
  status: string;
  started_at: string;
  messages: MessageOut[];
  /** Hastanın otomatik açılış mesajı (varsa `messages` içinde de assistant olarak gelir). */
  opening_message?: string;
}

export interface MessageOut {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ClinicalReasoning {
  toplam_mesaj: number;
  anamnez_sayisi: number;
  tetkik_sayisi: number;
  fizik_muayene_sayisi: number;
  konsultasyon_sayisi: number;
  ilk_eylem_oncesi_anamnez: number;
  anamnez_yorum: string;
  fizik_yorum: string;
}

export interface ReportOut {
  id: string;
  session_id: string;
  score: number;
  correct_diagnoses: string[];
  missed_diagnoses: string[];
  pathophysiology_note?: string;
  tus_reference?: string;
  recommendations?: string[];
  created_at: string;
  clinical_reasoning?: ClinicalReasoning;
}

export interface Question {
  id: string;
  case_id: string;
  specialty: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option?: string;
  explanation?: string;
  created_at: string;
  user_answered?: boolean;
  user_was_correct?: boolean;
}

export interface QuestionStats {
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  correct_rate: number;
  by_specialty: Record<string, { attempted: number; correct: number; rate: number }>;
}

export interface HistoryItem {
  session_id: string;
  case_title: string;
  specialty: string;
  difficulty: string;
  status: string;
  started_at: string;
  ended_at?: string;
  score?: number;
}

export const casesApi = {
  list: (params?: { specialty?: string; difficulty?: string }) =>
    api.get<Case[]>("/cases", { params }),
  getRandom: (params?: { specialties?: string; difficulty?: string }) =>
    api.get<Case>("/cases/random", { params }),
  getRecommended: () => api.get<Case>("/cases/recommended"),
  get: (id: string) => api.get<CaseDetail>(`/cases/${id}`),
};

export const questionsApi = {
  list: (params?: { specialty?: string }) =>
    api.get<Question[]>("/questions", { params }),
  practice: (params?: { specialty?: string; limit?: number }) =>
    api.get<Question[]>("/questions/practice", { params }),
  stats: () => api.get<QuestionStats>("/questions/stats"),
  get: (id: string) => api.get<Question>(`/questions/${id}`),
  answer: (id: string, selected_option: string) =>
    api.post<{ is_correct: boolean; correct_option: string; explanation: string }>(
      `/questions/${id}/answer`,
      { selected_option }
    ),
};

export interface PracticeMcqAllItem {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  specialty: string;
  meta_info: string;
  correct_option_label: string;
  correct_answer_text: string;
}

export const practiceMcqApi = {
  stats: () =>
    api.get<{
      total: number;
      by_specialty: Record<string, number>;
      by_step: Record<string, number>;
    }>("/practice-mcq/stats"),

  catalogVersion: () =>
    api.get<{ version: string; total: number }>("/practice-mcq/catalog-version"),

  catalogAll: () =>
    api.get<{
      total: number;
      version: string;
      questions: PracticeMcqAllItem[];
    }>("/practice-mcq/all"),

  random: (params?: { specialty?: string; step?: string }) =>
    api.get<{
      id: string;
      question: string;
      options: { label: string; text: string }[];
      source: string;
      meta_info: string;
      specialty: string;
    }>("/practice-mcq/random", { params }),

  verify: (id: string, selected_label: string) =>
    api.post<{
      correct: boolean;
      correct_label: string;
      correct_answer_text: string;
    }>("/practice-mcq/verify", { id, selected_label }),
};

export const sessionsApi = {
  create: (case_id: string) =>
    api.post<SessionOut>("/sessions", { case_id }),
  getSession: (id: string) =>
    api.get<any>(`/sessions/${id}`),
  diagnose: (id: string, diagnoses: string[]) =>
    api.post(`/sessions/${id}/diagnose`, { diagnoses }),
  complete: (id: string) => api.post(`/sessions/${id}/complete`),
  getReport: (id: string) =>
    api.get<ReportOut>(`/sessions/${id}/report`),
};

export interface LeaderboardItem {
  name: string;
  school?: string;
  year?: number;
  total_cases: number;
  average_score: number;
  total_score: number;
  /** Acil MCQ raporlarından toplam doğru cevap sayısı */
  emergency_correct: number;
}

export interface StudyNoteItem {
  session_id: string;
  case_title: string;
  specialty: string;
  missed_diagnoses: string[];
  pathophysiology_note?: string;
  tus_reference?: string;
  created_at: string;
}

/** MedQA acil alt kümesi — backend unified_emergency.jsonl */
export interface EmergencyMcqStats {
  path: string;
  mcq_count: number;
  total_jsonl_lines: number;
  /** Backend OPENAI_API_KEY geçerli mi (AI asistan için) */
  openai_configured?: boolean;
}

export interface EmergencyMcqRandom {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  source: string;
  emergency_score: number | null;
}

export interface EmergencyMcqVerifyResult {
  correct: boolean;
  correct_label: string | null;
  correct_answer_text: string | null;
}

export interface EmergencyMcqReportCreateItem {
  question_id: string;
  question_preview: string;
  correct: boolean;
  elapsed_sec?: number | null;
  selected_label?: string | null;
}

export interface EmergencyMcqReportCreateBody {
  items: EmergencyMcqReportCreateItem[];
  ai_messages: { role: "user" | "assistant"; content: string }[];
  patient_urges: string[];
}

export interface EmergencyMcqReportOut {
  id: string;
  score: number;
  correct_count: number;
  total_count: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  overview_note: string | null;
  tus_reference: string | null;
  time_management_note: string | null;
  ai_chat_note: string | null;
  patient_urge_note: string | null;
  created_at: string;
}

export interface EmergencyMcqReportListItem {
  id: string;
  score: number;
  correct_count: number;
  total_count: number;
  created_at: string;
}

export const emergencyMcqApi = {
  stats: () => api.get<EmergencyMcqStats>("/emergency-mcq/stats"),
  /** lang=tr: JSONL'de question_tr / options_tr varsa Türkçe döner; yoksa İngilizce kalır. */
  random: (lang: "en" | "tr" = "en") =>
    api.get<EmergencyMcqRandom>("/emergency-mcq/random", { params: { lang } }),
  byId: (id: string, lang = "tr") =>
    api.get<EmergencyMcqRandom>(`/emergency-mcq/by-id/${encodeURIComponent(id)}`, { params: { lang } }),
  explanation: (id: string, selected_label: string, lang = "tr") =>
    api.get<{ explanation: string; cached: boolean }>("/emergency-mcq/explanation", {
      params: { id, selected_label, lang },
    }),
  verify: (id: string, selected_label: string) =>
    api.post<EmergencyMcqVerifyResult>("/emergency-mcq/verify", { id, selected_label }),
  createReport: (body: EmergencyMcqReportCreateBody) =>
    api.post<EmergencyMcqReportOut>("/emergency-mcq/reports", body, { timeout: 120_000 }),
  listReports: (limit = 30) =>
    api.get<EmergencyMcqReportListItem[]>("/emergency-mcq/reports", { params: { limit } }),
  getReport: (id: string) => api.get<EmergencyMcqReportOut>(`/emergency-mcq/reports/${encodeURIComponent(id)}`),
};

// ── Study (günlük çalışma + FSRS) ─────────────────────────────────────────────

export interface StudyWeakTopic {
  topic_slug: string;
  topic_label: string;
  wrong_count: number;
  total_count: number;
}

export interface StudyDashboard {
  daily_goal: number;
  answered_today: number;
  due_count: number;
  current_streak: number;
  longest_streak: number;
  pool_mcq_count: number;
  weak_topics: StudyWeakTopic[];
}

export interface StudyQuestion {
  mcq_id: string;
  pool: string;
  question: string;
  options: { label: string; text: string }[];
  is_review: boolean;
  topic_slug: string | null;
  topic_label: string | null;
}

export interface StudySessionStart {
  session_id: string;
  mode: "daily" | "acil" | "usmle";
  goal: number;
  questions: StudyQuestion[];
}

export interface StudyRemediation {
  topic_slug: string;
  topic_label: string;
  map_href?: string | null;
}

export interface StudyAnswerResult {
  correct: boolean;
  correct_label: string | null;
  correct_answer_text: string | null;
  remediation: StudyRemediation | null;
  due_count: number;
  answered_today: number;
}

export interface StudyTopicMastery {
  topic_slug: string;
  topic_label: string;
  seen: number;
  correct: number;
  mastery_pct: number;
  map_href: string | null;
}

export const studyApi = {
  dashboard: () => api.get<StudyDashboard>("/study/dashboard"),
  patchSettings: (daily_goal: number) =>
    api.patch<{ daily_goal: number; preferred_pool: string }>("/study/settings", { daily_goal }),
  startSession: (goal: number, mode: "daily" | "acil" | "usmle" = "daily") =>
    api.post<StudySessionStart>("/study/session/start", { goal, mode }),
  answer: (body: {
    mcq_id: string;
    pool: string;
    selected_label: string;
    session_id?: string;
    elapsed_ms?: number;
  }) => api.post<StudyAnswerResult>("/study/session/answer", body),
  topics: () => api.get<StudyTopicMastery[]>("/study/topics"),
};

export interface LearningCard {
  report_id: string;
  case_id: string;
  case_title: string;
  specialty: string;
  difficulty: string;
  pathophysiology_note: string | null;
  tus_reference: string | null;
  score: number;
  created_at: string;
}

export interface LearningCardsPage {
  items: LearningCard[];
  total: number;
  limit: number;
  offset: number;
}

export const learningApi = {
  cards: (params?: { specialty?: string; limit?: number; offset?: number }) =>
    api.get<LearningCardsPage>("/learning/cards", { params }),
  specialties: () => api.get<string[]>("/learning/specialties"),
};

// ── Farmakoloji Mantık Haritaları ─────────────────────────────────────────────

export type PharmaNodeType = "receptor" | "mediator" | "organ" | "effect" | "drug_class";
export type PharmaRelation = "activates" | "inhibits" | "agonist" | "antagonist";

export interface PharmaSignaling {
  pathway: string;
  second_messenger: string;
  clinical_hook_tr: string;
}

export interface PharmaNode {
  id: string;
  label_tr: string;
  type: PharmaNodeType;
  description_tr: string;
  high_yield: boolean;
  memory_hook_tr?: string;
  signaling?: PharmaSignaling | null;
}

export interface PharmaEdge {
  source: string;
  target: string;
  relation: PharmaRelation;
  effect_tr: string;
}

export interface PharmaDownstreamEffect {
  nodeId: string;
  effect_tr: string;
}

export interface PharmaIntervention {
  drug_class: string;
  label_tr: string;
  targets: string[];
  relation: PharmaRelation;
  downstream_effects: PharmaDownstreamEffect[];
  tr_products_atc: string[];
}

export interface PharmaQuizItem {
  q_tr: string;
  options_tr: string[];
  answer_idx: number;
  explanation_tr: string;
  node_id?: string | null;
}

export interface PharmaVignette {
  id: string;
  title_tr: string;
  scenario_tr: string;
  q_tr: string;
  options_tr: string[];
  answer_idx: number;
  explanation_tr: string;
  node_id?: string | null;
}

export interface PharmaMapSummary {
  id: string;
  title_tr: string;
  description_tr: string;
  order: number;
  level: string;
  estimated_minutes: number;
  prerequisites: string[];
  high_yield_count: number;
  quiz_count: number;
  vignette_count: number;
}

export interface PharmaMap {
  id: string;
  title_tr: string;
  description_tr: string;
  source_attribution: string;
  nodes: PharmaNode[];
  edges: PharmaEdge[];
  interventions: PharmaIntervention[];
  quiz: PharmaQuizItem[];
  vignettes: PharmaVignette[];
}

export interface PharmaLearningPathItem {
  map_id: string;
  order: number;
  level: string;
  estimated_minutes: number;
  prerequisites: string[];
}

export interface PharmaLearningPath {
  title_tr: string;
  description_tr: string;
  items: PharmaLearningPathItem[];
}

export const pharmaApi = {
  listMaps: () => api.get<PharmaMapSummary[]>("/pharma/maps"),
  getMap: (mapId: string) => api.get<PharmaMap>(`/pharma/maps/${mapId}`),
  getLearningPath: () => api.get<PharmaLearningPath>("/pharma/learning-path"),
};

export const usersApi = {
  history: () => api.get<HistoryItem[]>("/users/me/history"),
  getLeaderboard: () => api.get<LeaderboardItem[]>("/users/leaderboard"),
  getStudyNotes: () => api.get<StudyNoteItem[]>("/users/study-notes"),
  updateProfile: (data: { name?: string; school?: string; year?: number }) =>
    api.patch<UserOut>("/users/me", data),
};

export interface UserOut {
  id: string;
  email: string;
  name: string;
  school?: string;
  year?: number;
  is_admin: boolean;
  daily_limit: number;
}

export const authApi = {
  me: () => api.get<UserOut>("/auth/me"),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/auth/change-password", data),
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  school?: string;
  year?: number;
  is_admin: boolean;
  daily_limit: number;
}

// ── Histoloji ─────────────────────────────────────────────────────────────────

export interface HistologyImage {
  id: string;
  case_id?: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  specialty?: string;
  /** Örn. H&E, PAS */
  stain?: string | null;
  /** Örn. Böbrek, Meme */
  organ?: string | null;
  /** wikimedia | huggingface | upload */
  asset_source?: string | null;
  /** clinical (boş) | basic_cell_tissue | basic_organ_system */
  curriculum_track?: string | null;
  /** epithelium, muscle_tissue, respiratory, … */
  science_unit?: string | null;
  created_at: string;
}

export interface OrphanDziFile {
  relative_path: string;
  image_url: string;
  has_thumb: boolean;
}

export const adminApi = {
  getUsers: () => api.get<AdminUser[]>("/admin/users"),
  updateLimit: (userId: string, limit: number) =>
    api.put(`/admin/users/${userId}/limit`, { daily_limit: limit }),
  deleteImage: (imageId: string) =>
    api.delete(`/admin/images/${imageId}`),
  /** Redis önbelleği atlanır; admin paneli için tam liste. */
  listHistologyImages: () => api.get<HistologyImage[]>("/admin/histology-images"),
  listOrphanDzi: () => api.get<OrphanDziFile[]>("/admin/tiles/orphan-dzi"),
  registerDzi: (body: { relative_path: string; title: string; specialty?: string }) =>
    api.post<HistologyImage>("/admin/tiles/register-dzi", body),
  patchHistologyImage: (
    imageId: string,
    data: { title?: string; description?: string | null },
  ) => api.patch<HistologyImage>(`/admin/histology-images/${imageId}`, data),
  /** Hugging Face Hub'dan TIFF/SVS indirip sunucuda DZI üretir (admin). */
  importHfTiff: (body: {
    repo_id: string;
    path_in_repo: string;
    title: string;
    description?: string;
    specialty?: string;
    stain?: string;
    organ?: string;
    curriculum_track?: string;
    science_unit?: string;
    repo_type?: string;
  }) =>
    api.post<HistologyImage>("/admin/hf/import-tiff", body, {
      timeout: 600_000,
    }),
};

export interface HuggingFaceDatasetSpotlight {
  id: string;
  downloads: number;
  likes: number;
  url: string;
  description: string;
}

export interface AnnotationOut {
  id: string;
  image_id: string;
  user_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  note: string;
  created_at: string;
}

export interface AnnotationCreate {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  note: string;
}

export const microscopyApi = {
  listImages: (params?: {
    case_id?: string;
    specialty?: string;
    stain?: string;
    organ?: string;
    asset_source?: string;
    curriculum_track?: string;
    science_unit?: string;
  }) => api.get<HistologyImage[]>("/microscope/images", { params }),
  exploreHuggingface: (params?: { q?: string; limit?: number }) =>
    api.get<{ query: string; datasets: HuggingFaceDatasetSpotlight[] }>(
      "/microscope/explore/huggingface",
      { params }
    ),
  getImage: (id: string) =>
    api.get<HistologyImage>(`/microscope/images/${id}`),
  createImage: (data: Omit<HistologyImage, "id" | "created_at">) =>
    api.post<HistologyImage>("/microscope/images", data),
  /** TIFF/SVS/NDPI ve raster (JPEG, PNG, GIF) → sunucuda DZI */
  uploadTiff: (
    file: File,
    meta: {
      title: string;
      description?: string;
      specialty?: string;
      stain?: string;
      organ?: string;
      curriculum_track?: string;
      science_unit?: string;
    },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", meta.title);
    form.append("description", meta.description ?? "");
    form.append("specialty", meta.specialty ?? "");
    form.append("stain", meta.stain ?? "");
    form.append("organ", meta.organ ?? "");
    form.append("curriculum_track", meta.curriculum_track ?? "");
    form.append("science_unit", meta.science_unit ?? "");
    return api.post<HistologyImage>("/microscope/images/upload", form, {
      headers: { "Content-Type": undefined }, // axios FormData boundary'i otomatik ekler
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 600_000, // 10 dk — büyük dosya + dönüşüm
    });
  },
  /** Hazır .dzi + stem_files/ içindeki tüm karolar (tek istek) */
  uploadDziBundle: (
    paths: string[],
    files: File[],
    meta: {
      title: string;
      description?: string;
      specialty?: string;
      stain?: string;
      organ?: string;
      curriculum_track?: string;
      science_unit?: string;
    },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    for (let i = 0; i < paths.length; i++) {
      form.append("bundle_paths", paths[i]);
      form.append("bundle_files", files[i]);
    }
    form.append("title", meta.title);
    form.append("description", meta.description ?? "");
    form.append("specialty", meta.specialty ?? "");
    form.append("stain", meta.stain ?? "");
    form.append("organ", meta.organ ?? "");
    form.append("curriculum_track", meta.curriculum_track ?? "");
    form.append("science_unit", meta.science_unit ?? "");
    return api.post<HistologyImage>("/microscope/images/upload-dzi-bundle", form, {
      headers: { "Content-Type": undefined },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 600_000,
    });
  },
  listAnnotations: (image_id: string) =>
    api.get<AnnotationOut[]>(`/microscope/images/${image_id}/annotations`),
  addAnnotation: (image_id: string, data: AnnotationCreate) =>
    api.post<AnnotationOut>(`/microscope/images/${image_id}/annotations`, data),
  deleteAnnotation: (image_id: string, annotation_id: string) =>
    api.delete(`/microscope/images/${image_id}/annotations/${annotation_id}`),
  deleteImage: (image_id: string) =>
    api.delete(`/microscope/images/${image_id}`),
};

// ── Default Export ───────────────────────────────────────────────────────────
export default api;
