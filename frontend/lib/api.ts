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
        await storage.removeItem("access_token");
        await storage.removeItem("refresh_token");
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
  created_at: string;
}

/** GET /community/notes/:id — tam metin dahil */
export interface CommunityNoteDetail extends CommunityNoteItem {
  body: string;
}

export interface ToggleLikeResponse {
  liked: boolean;
  likes: number;
}

export interface ToggleSaveResponse {
  saved: boolean;
}

/** Sunucu taksonomisi — `tus-taxonomy.ts` ile senkron tutulmalı. */
export type TusTaxonomyPayload = {
  version: number;
  groups: {
    temel: Record<string, string[]>;
    klinik: Record<string, string[]>;
  };
};

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
  }) => api.get<CommunityNoteItem[]>("/community/me/kaydedilenler", { params }),
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
    api.post<ToggleLikeResponse>(`/community/notes/${noteId}/like`),
  toggleSave: (noteId: string) =>
    api.post<ToggleSaveResponse>(`/community/notes/${noteId}/kaydet`),
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
  /** Hugging Face Hub'dan TIFF/SVS indirip sunucuda DZI üretir (admin). */
  importHfTiff: (body: {
    repo_id: string;
    path_in_repo: string;
    title: string;
    description?: string;
    specialty?: string;
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
  uploadTiff: (
    file: File,
    meta: { title: string; description?: string; specialty?: string },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", meta.title);
    form.append("description", meta.description ?? "");
    form.append("specialty", meta.specialty ?? "");
    return api.post<HistologyImage>("/microscope/images/upload", form, {
      headers: { "Content-Type": undefined }, // axios FormData boundary'i otomatik ekler
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 600_000, // 10 dk — büyük dosya + dönüşüm
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
