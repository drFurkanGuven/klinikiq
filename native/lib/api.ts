import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import { queryClient } from "./query-client";
import { storage } from "./storage";

export const BASE_URL = "https://klinikiq.furkanguven.space/api";

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

export interface DrugSummary {
  drugbank_id: string;
  name: string;
  drug_type: string | null;
  groups: string | null;
  atc_codes: string | null;
  indication: string | null;
}

export interface DrugDetail {
  drugbank_id: string;
  name: string;
  drug_type: string | null;
  groups: string | null;
  description: string | null;
  indication: string | null;
  mechanism: string | null;
  pharmacodynamics: string | null;
  toxicity: string | null;
  metabolism: string | null;
  absorption: string | null;
  half_life: string | null;
  protein_binding: string | null;
  route_of_elimination: string | null;
  volume_of_distribution: string | null;
  drug_interactions: string | null;
  food_interactions: string | null;
  targets: string | null;
  atc_codes: string | null;
  average_mass: string | null;
}

export interface DrugSearchResponse {
  total: number;
  page: number;
  results: DrugSummary[];
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

// ── Axios ───────────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

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
    const isAuthPublic =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthPublic
    ) {
      original._retry = true;
      await storage.removeToken();
      queryClient.clear();
      router.replace("/(auth)/login");
    }
    return Promise.reject(error);
  }
);

// ── API grupları ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
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

export const drugsApi = {
  search: (q: string, page = 1, limit = 25, atc_class?: string) =>
    api.get<DrugSearchResponse>("/drugs/search", {
      params: { q, page, limit, ...(atc_class ? { atc_class } : {}) },
    }),
  detail: (drugbank_id: string) =>
    api.get<DrugDetail>(`/drugs/${encodeURIComponent(drugbank_id)}`),
  compare: (ids: string[]) =>
    api.get<{ drugs: DrugDetail[] }>("/drugs/compare", {
      params: { ids: ids.join(",") },
    }),
  atcTree: () => api.get<{ categories: string[] }>("/drugs/atc-tree"),
  byAtc: (category: string) =>
    api.get<{ results: DrugSummary[] }>("/drugs/by-atc", { params: { category } }),
};

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

// ── Antibiyotik veri tabanı ─────────────────────────────────────────────────

export interface AntibioticByDrugClass {
  drug_class: string;
  total: number;
  resistance_mechanisms: {
    resistance_mechanism: string;
    count: number;
    gene_families: string[];
    entries: {
      antibiotic_name: string;
      organism: string | null;
      resistance_mechanism: string | null;
      aro_accession: string | null;
      amr_gene_family: string | null;
      drug_class: string | null;
      description: string | null;
    }[];
  }[];
}

export const antibioticsApi = {
  drugClasses: () => api.get<{ classes: string[] }>("/antibiotics/drug-classes"),
  byDrugClass: (drug_class: string) =>
    api.get<AntibioticByDrugClass>("/antibiotics/by-drug-class", {
      params: { drug_class },
    }),
};

// ── Topluluk notları (frontend/lib/api.ts ile uyumlu) ───────────────────────

export interface CommunityNoteAttachment {
  id: string;
  kind: "image" | "pdf" | string;
  filename: string;
  url: string;
  size_bytes: number;
}

export interface CommunityNoteItem {
  id: string;
  group: "temel" | "klinik";
  branch_id: string;
  topic_id: string;
  title: string;
  excerpt: string;
  author_display: string;
  likes: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  is_mine: boolean;
  moderation_status: "pending" | "published" | "rejected";
  created_at: string;
  body_truncated?: boolean;
  attachments?: CommunityNoteAttachment[];
}

export interface CommunityNoteDetail extends CommunityNoteItem {
  body: string;
}

export type TusTaxonomyPayload = {
  version: number;
  groups: {
    temel: Record<string, string[]>;
    klinik: Record<string, string[]>;
  };
};

async function communityUploadMultipart(
  noteId: string,
  file: { uri: string; name: string; type: string }
): Promise<CommunityNoteAttachment> {
  await storage.waitForInit();
  const token = await storage.getToken();
  const form = new FormData();
  form.append(
    "file",
    { uri: file.uri, name: file.name, type: file.type } as unknown as Blob
  );
  const url = `${BASE_URL}/community/notes/${encodeURIComponent(noteId)}/attachments`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  if (res.status === 401) {
    await storage.removeToken();
    queryClient.clear();
    router.replace("/(auth)/login");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      detail?: unknown;
    };
    throw Object.assign(new Error("Upload failed"), {
      response: { status: res.status, data: errBody },
    });
  }
  return (await res.json()) as CommunityNoteAttachment;
}

export const communityApi = {
  getTaxonomy: () => api.get<TusTaxonomyPayload>("/community/taksonomi"),
  listNotes: (params?: {
    group?: string;
    branch_id?: string;
    topic_id?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => api.get<CommunityNoteItem[]>("/community/notes", { params }),
  listSavedNotes: (params?: {
    group?: string;
    branch_id?: string;
    topic_id?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get<CommunityNoteItem[]>("/community/me/kaydedilenler", { params }),
  createNote: (data: {
    group: "temel" | "klinik";
    branch_id: string;
    topic_id: string;
    title: string;
    body: string;
  }) => api.post<CommunityNoteItem>("/community/notes", data),
  getNote: (noteId: string) =>
    api.get<CommunityNoteDetail>(`/community/notes/${noteId}`),
  updateNote: (
    noteId: string,
    data: Partial<{
      group: "temel" | "klinik";
      branch_id: string;
      topic_id: string;
      title: string;
      body: string;
    }>
  ) => api.patch<CommunityNoteDetail>(`/community/notes/${noteId}`, data),
  deleteNote: (noteId: string) =>
    api.delete<void>(`/community/notes/${noteId}`),
  toggleLike: (noteId: string) =>
    api.post<{ liked: boolean; likes: number }>(
      `/community/notes/${noteId}/like`
    ),
  toggleSave: (noteId: string) =>
    api.post<{ saved: boolean }>(`/community/notes/${noteId}/kaydet`),
  uploadNoteAttachment: (
    noteId: string,
    file: { uri: string; name: string; type: string }
  ) =>
    communityUploadMultipart(noteId, file).then((data) => ({ data })),
  deleteNoteAttachment: (noteId: string, attachmentId: string) =>
    api.delete<void>(
      `/community/notes/${encodeURIComponent(noteId)}/attachments/${encodeURIComponent(attachmentId)}`
    ),
};

/** Dashboard vb. için (frontend usersApi ile aynı uç) */
export const usersApi = {
  history: () => api.get<HistoryItem[]>("/users/me/history"),
  getLeaderboard: () => leaderboardApi.list(),
  updateProfile: (data: { name?: string; school?: string; year?: number }) =>
    api.patch<UserOut>("/users/me", data),
};

export default api;
