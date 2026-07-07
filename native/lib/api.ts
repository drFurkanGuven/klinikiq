import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import { queryClient } from "./query-client";
import { storage } from "./storage";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://klinikiq.furkanguven.space/api";

// ── Types (frontend/lib/api.ts ile uyumlu) ───────────────────────────────────

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
  patient_json: Record<string, unknown>;
  educational_notes?: string;
}

export interface SessionOut {
  id: string;
  case_id: string;
  status: string;
  started_at: string;
  messages: MessageOut[];
  opening_message?: string;
}

/** GET /sessions/:id — tam oturum (native vaka ekranı) */
export interface SessionPatientOut {
  name?: string;
  age?: number | string;
  gender?: string;
  chief_complaint?: string;
}

export interface SessionCaseOut {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  patient: SessionPatientOut;
  educational_notes?: string;
}

export interface SessionMessageOut {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface SessionDetailOut {
  session_id: string;
  status: string;
  case: SessionCaseOut;
  messages: SessionMessageOut[];
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
  /** Bazı yanıtlarda (paylaşım metni vb.) */
  case?: { title?: string };
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

export interface LeaderboardItem {
  name: string;
  school?: string;
  year?: number;
  total_cases: number;
  average_score: number;
  total_score: number;
  emergency_correct: number;
}

export interface EmergencyMcqStats {
  path: string;
  mcq_count: number;
  total_jsonl_lines: number;
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

export interface UserOut {
  id: string;
  email: string;
  name: string;
  school?: string;
  year?: number;
  is_admin: boolean;
  daily_limit: number;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface AccessTokenResponse {
  access_token: string;
}

// ── Axios ───────────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<AccessTokenResponse>(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" }, timeout: 15_000 }
    );
    const persistent = storage.isTokenPersistent();
    await storage.setToken(res.data.access_token, persistent);
    return res.data.access_token;
  } catch {
    return null;
  }
}

function isAuthPublicUrl(url: string): boolean {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh")
  );
}

async function forceLogout(): Promise<void> {
  await storage.removeToken();
  queryClient.clear();
  router.replace("/(auth)/login");
}

api.interceptors.request.use(async (config) => {
  await storage.waitForInit();
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const url = String(original?.url ?? "");
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthPublicUrl(url)
    ) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      await forceLogout();
    }
    return Promise.reject(error);
  }
);

// ── API grupları ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    name: string;
    school?: string;
    year?: number;
  }) => api.post<LoginResponse>("/auth/register", data),
  me: () => api.get<UserOut>("/auth/me"),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/auth/change-password", data),
};

export const casesApi = {
  list: (params?: { specialty?: string; difficulty?: string }) =>
    api.get<Case[]>("/cases", { params }),
  getRandom: (params?: { specialties?: string; difficulty?: string }) =>
    api.get<Case>("/cases/random", { params }),
  getRecommended: () => api.get<Case>("/cases/recommended"),
  get: (id: string) => api.get<CaseDetail>(`/cases/${id}`),
};

export const sessionsApi = {
  create: (case_id: string) => api.post<SessionOut>("/sessions", { case_id }),
  getSession: (id: string) =>
    api.get<SessionDetailOut>(`/sessions/${encodeURIComponent(id)}`),
  diagnose: (id: string, diagnoses: string[]) =>
    api.post(`/sessions/${id}/diagnose`, { diagnoses }),
  complete: (id: string) => api.post(`/sessions/${id}/complete`),
  getReport: (id: string) => api.get<ReportOut>(`/sessions/${id}/report`),
};

export const emergencyMcqApi = {
  stats: () => api.get<EmergencyMcqStats>("/emergency-mcq/stats"),
  random: (lang: "en" | "tr" = "en") =>
    api.get<EmergencyMcqRandom>("/emergency-mcq/random", { params: { lang } }),
  byId: (id: string, lang = "tr") =>
    api.get<EmergencyMcqRandom>(`/emergency-mcq/by-id/${encodeURIComponent(id)}`, {
      params: { lang },
    }),
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
  getReport: (id: string) =>
    api.get<EmergencyMcqReportOut>(`/emergency-mcq/reports/${encodeURIComponent(id)}`),
};

export interface StudyDashboard {
  daily_goal: number;
  answered_today: number;
  due_count: number;
  current_streak: number;
  longest_streak: number;
  pool_mcq_count: number;
  weak_topics: {
    topic_slug: string;
    topic_label: string;
    wrong_count: number;
    total_count: number;
  }[];
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

export interface StudyAnswerResult {
  correct: boolean;
  correct_label: string | null;
  correct_answer_text: string | null;
  remediation: {
    topic_slug: string;
    topic_label: string;
    map_href?: string | null;
  } | null;
  due_count: number;
  answered_today: number;
}

export const studyApi = {
  dashboard: () => api.get<StudyDashboard>("/study/dashboard"),
  patchSettings: (daily_goal: number) =>
    api.patch<{ daily_goal: number; preferred_pool: string }>("/study/settings", {
      daily_goal,
    }),
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

export interface StudyTopicMastery {
  topic_slug: string;
  topic_label: string;
  seen: number;
  correct: number;
  mastery_pct: number;
  map_href: string | null;
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

export type PharmaNodeType =
  | "receptor"
  | "mediator"
  | "organ"
  | "effect"
  | "drug_class";

export type PharmaRelation = "activates" | "inhibits" | "agonist" | "antagonist";

export interface PharmaNode {
  id: string;
  label_tr: string;
  type: PharmaNodeType;
  description_tr: string;
  high_yield: boolean;
  memory_hook_tr?: string;
}

export interface PharmaEdge {
  source: string;
  target: string;
  relation: PharmaRelation;
  effect_tr: string;
  mediated_by?: string | string[];
}

export interface PharmaMap {
  id: string;
  title_tr: string;
  description_tr: string;
  source_attribution: string;
  path_tree_root?: string | null;
  nodes: PharmaNode[];
  edges: PharmaEdge[];
  interventions: unknown[];
  quiz: unknown[];
  vignettes: unknown[];
}

export const pharmaApi = {
  listMaps: () => api.get<PharmaMapSummary[]>("/pharma/maps"),
  getMap: (mapId: string) => api.get<PharmaMap>(`/pharma/maps/${mapId}`),
};

export interface PharmaMapProgressRow {
  map_id: string;
  visited: boolean;
  quiz_completed: boolean;
  quiz_score_pct: number | null;
  path_tree_completed: boolean;
  completed_at: string | null;
}

export type PharmaMapProgressPatch = {
  visited?: boolean;
  quiz_completed?: boolean;
  quiz_score_pct?: number | null;
  path_tree_completed?: boolean;
  completed_at?: string | null;
};

export const pharmaProgressApi = {
  getProgress: () => api.get<PharmaMapProgressRow[]>("/pharma/progress"),
  patchProgress: (mapId: string, body: PharmaMapProgressPatch) =>
    api.patch<PharmaMapProgressRow>(
      `/pharma/progress/${encodeURIComponent(mapId)}`,
      body
    ),
};

export interface StudyNoteItem {
  session_id: string;
  case_title: string;
  specialty: string;
  missed_diagnoses: string[];
  pathophysiology_note?: string;
  tus_reference?: string;
  created_at: string;
}

export const leaderboardApi = {
  list: () => api.get<LeaderboardItem[]>("/users/leaderboard"),
};

// ── Öğren: soru bankası ─────────────────────────────────────────────────────

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
  by_specialty: Record<
    string,
    { attempted: number; correct: number; rate: number }
  >;
}

export const questionsApi = {
  stats: () => api.get<QuestionStats>("/questions/stats"),
  practice: (params?: { specialty?: string; limit?: number }) =>
    api.get<Question[]>("/questions/practice", { params }),
  answer: (id: string, selected_option: string) =>
    api.post<{
      is_correct: boolean;
      correct_option: string;
      explanation: string;
    }>(`/questions/${id}/answer`, { selected_option }),
};

// ── Öğren: geçmiş rapor kartları ────────────────────────────────────────────

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

// ── Histoloji (web /microscope ile aynı) ─────────────────────────────────────

export interface HistologyImage {
  id: string;
  case_id?: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  specialty?: string;
  stain?: string | null;
  organ?: string | null;
  asset_source?: string | null;
  curriculum_track?: string | null;
  science_unit?: string | null;
  created_at: string;
}

/** Göreli `tiles/...` veya tam URL → görüntülenebilir raster URL (web ile aynı mantık) */
export function resolveHistologyImageUrl(
  url?: string | null,
  fullUrl?: string | null
): string {
  const targetUrl = url || fullUrl;
  if (!targetUrl) return "";
  if (targetUrl.startsWith("http")) return targetUrl;
  let cleanPath = targetUrl.replace(/^\/+/, "");
  if (!url && cleanPath.endsWith(".dzi")) {
    cleanPath = cleanPath.replace(".dzi", "_thumb.jpg");
  }
  const finalPath = cleanPath.startsWith("tiles/")
    ? `/${cleanPath}`
    : `/tiles/${cleanPath}`;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${encodeURI(finalPath)}`;
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
  getImage: (id: string) =>
    api.get<HistologyImage>(`/microscope/images/${encodeURIComponent(id)}`),
};

/** Dashboard vb. için (frontend usersApi ile aynı uç) */
export const usersApi = {
  history: () => api.get<HistoryItem[]>("/users/me/history"),
  getLeaderboard: () => leaderboardApi.list(),
  getStudyNotes: () => api.get<StudyNoteItem[]>("/users/study-notes"),
  updateProfile: (data: { name?: string; school?: string; year?: number }) =>
    api.patch<UserOut>("/users/me", data),
};

// ── Practice MCQ (USMLE Bankası) ─────────────────────────────────────────────

export interface PracticeMcqItem {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  specialty: string;
  meta_info: string;
  correct_option_label: string;
  correct_answer_text: string;
}

export interface PracticeMcqCatalogVersion {
  version: string;
  total: number;
}

export interface PracticeMcqAll {
  total: number;
  version: string;
  questions: PracticeMcqItem[];
}

export const practiceMcqApi = {
  catalogVersion: () =>
    api.get<PracticeMcqCatalogVersion>("/practice-mcq/catalog-version"),
  catalogAll: () =>
    api.get<PracticeMcqAll>("/practice-mcq/all", { timeout: 60000 }),
  verify: (id: string, selected_label: string) =>
    api.post<{
      correct: boolean;
      correct_label: string;
      correct_answer_text: string;
    }>("/practice-mcq/verify", { id, selected_label }),
};

export default api;
