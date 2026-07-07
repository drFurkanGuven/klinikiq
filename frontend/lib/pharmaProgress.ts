/** Farmakoloji harita ilerlemesi — localStorage (kullanıcı bazlı, sunucu yok). */

const STORAGE_KEY = "klinikiq_pharma_progress_v1";

export interface PharmaMapProgress {
  /** Harita en az bir kez açıldı */
  visited: boolean;
  /** Quiz tamamlandı (≥70% veya tüm sorular cevaplandı) */
  quizCompleted: boolean;
  /** Son quiz skoru (0–100) */
  quizScorePct: number | null;
  /** Yolak yürüyüşü egzersizi tamamlandı */
  pathTreeCompleted: boolean;
  completedAt: string | null;
}

type ProgressStore = Record<string, PharmaMapProgress>;

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function defaultProgress(): PharmaMapProgress {
  return {
    visited: false,
    quizCompleted: false,
    quizScorePct: null,
    pathTreeCompleted: false,
    completedAt: null,
  };
}

export function getMapProgress(mapId: string): PharmaMapProgress {
  const store = readStore();
  return store[mapId] ?? defaultProgress();
}

export function markMapVisited(mapId: string) {
  const store = readStore();
  const cur = store[mapId] ?? defaultProgress();
  store[mapId] = { ...cur, visited: true };
  writeStore(store);
}

export function markQuizCompleted(mapId: string, scorePct: number) {
  const store = readStore();
  const cur = store[mapId] ?? defaultProgress();
  const completed = scorePct >= 70;
  store[mapId] = {
    ...cur,
    visited: true,
    quizCompleted: completed || cur.quizCompleted,
    quizScorePct: scorePct,
    completedAt: completed ? new Date().toISOString() : cur.completedAt,
  };
  writeStore(store);
}

export function markPathTreeCompleted(mapId: string) {
  const store = readStore();
  const cur = store[mapId] ?? defaultProgress();
  store[mapId] = { ...cur, visited: true, pathTreeCompleted: true };
  writeStore(store);
}

/** @deprecated Vignette kaldırıldı — geriye dönük localStorage uyumu */
export function markVignetteDone(_mapId: string, _vignetteId: string) {
  /* no-op */
}

/** Ön koşul haritalar tamamlandı mı? */
export function prerequisitesMet(prerequisites: string[]): boolean {
  if (prerequisites.length === 0) return true;
  const store = readStore();
  return prerequisites.every((id) => {
    const p = store[id];
    return p?.quizCompleted === true;
  });
}

export function isMapCompleted(mapId: string): boolean {
  const p = getMapProgress(mapId);
  return p.quizCompleted;
}

export function getOverallProgress(mapIds: string[]): { completed: number; total: number; pct: number } {
  const total = mapIds.length;
  const completed = mapIds.filter((id) => isMapCompleted(id)).length;
  return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
