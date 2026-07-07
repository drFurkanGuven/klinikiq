/** Farmakoloji harita ilerlemesi — localStorage cache + sunucu senkronu. */

import { pharmaApi } from "./api";
import { isAuthenticated } from "./auth";

const STORAGE_KEY = "klinikiq_pharma_progress_v1";

export interface PharmaMapProgress {
  visited: boolean;
  quizCompleted: boolean;
  quizScorePct: number | null;
  pathTreeCompleted: boolean;
  completedAt: string | null;
}

type ProgressStore = Record<string, PharmaMapProgress>;

let hydratePromise: Promise<void> | null = null;

function defaultProgress(): PharmaMapProgress {
  return {
    visited: false,
    quizCompleted: false,
    quizScorePct: null,
    pathTreeCompleted: false,
    completedAt: null,
  };
}

function readLocalStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

function writeLocalStore(store: ProgressStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function serverRowToClient(row: {
  map_id: string;
  visited: boolean;
  quiz_completed: boolean;
  quiz_score_pct: number | null;
  path_tree_completed: boolean;
  completed_at: string | null;
}): PharmaMapProgress {
  return {
    visited: row.visited,
    quizCompleted: row.quiz_completed,
    quizScorePct: row.quiz_score_pct,
    pathTreeCompleted: row.path_tree_completed,
    completedAt: row.completed_at,
  };
}

function mergeEntry(a: PharmaMapProgress, b: PharmaMapProgress): PharmaMapProgress {
  const scoreA = a.quizScorePct ?? -1;
  const scoreB = b.quizScorePct ?? -1;
  return {
    visited: a.visited || b.visited,
    quizCompleted: a.quizCompleted || b.quizCompleted,
    quizScorePct: scoreA >= scoreB ? a.quizScorePct : b.quizScorePct,
    pathTreeCompleted: a.pathTreeCompleted || b.pathTreeCompleted,
    completedAt: a.completedAt || b.completedAt,
  };
}

function mergeStores(local: ProgressStore, remote: ProgressStore): ProgressStore {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: ProgressStore = {};
  for (const id of ids) {
    out[id] = mergeEntry(local[id] ?? defaultProgress(), remote[id] ?? defaultProgress());
  }
  return out;
}

function clientToPatch(p: PharmaMapProgress) {
  return {
    visited: p.visited || undefined,
    quiz_completed: p.quizCompleted || undefined,
    quiz_score_pct: p.quizScorePct,
    path_tree_completed: p.pathTreeCompleted || undefined,
    completed_at: p.completedAt,
  };
}

async function pushStoreToServer(store: ProgressStore) {
  const entries = Object.entries(store);
  await Promise.all(
    entries.map(([mapId, prog]) =>
      pharmaApi.patchProgress(mapId, clientToPatch(prog)).catch(() => {})
    )
  );
}

/** Giriş yapmış kullanıcı için sunucu ↔ localStorage birleştir. */
export function ensurePharmaProgressHydrated(): Promise<void> {
  if (!isAuthenticated()) return Promise.resolve();
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const res = await pharmaApi.getProgress();
        const remote: ProgressStore = {};
        for (const row of res.data) {
          remote[row.map_id] = serverRowToClient(row);
        }
        const local = readLocalStore();
        const merged = mergeStores(local, remote);
        writeLocalStore(merged);
        // Local'de olup sunucuda eksik olan ilerlemeyi yükle
        const toUpload: ProgressStore = {};
        for (const [mapId, prog] of Object.entries(merged)) {
          const hadRemote = mapId in remote;
          const hadLocal = mapId in local;
          if (hadLocal && (!hadRemote || JSON.stringify(local[mapId]) !== JSON.stringify(remote[mapId]))) {
            toUpload[mapId] = prog;
          }
        }
        if (Object.keys(toUpload).length > 0) {
          await pushStoreToServer(toUpload);
        }
      } catch {
        /* offline — local cache kullanılır */
      }
    })();
  }
  return hydratePromise;
}

function readStore(): ProgressStore {
  return readLocalStore();
}

function writeStore(store: ProgressStore) {
  writeLocalStore(store);
}

function syncMap(mapId: string, prog: PharmaMapProgress) {
  if (!isAuthenticated()) return;
  void pharmaApi.patchProgress(mapId, clientToPatch(prog)).catch(() => {});
}

export function getMapProgress(mapId: string): PharmaMapProgress {
  const store = readStore();
  return store[mapId] ?? defaultProgress();
}

export function markMapVisited(mapId: string) {
  const store = readStore();
  const cur = store[mapId] ?? defaultProgress();
  const next = { ...cur, visited: true };
  store[mapId] = next;
  writeStore(store);
  syncMap(mapId, next);
}

export function markQuizCompleted(mapId: string, scorePct: number) {
  const store = readStore();
  const cur = store[mapId] ?? defaultProgress();
  const completed = scorePct >= 70;
  const next: PharmaMapProgress = {
    ...cur,
    visited: true,
    quizCompleted: completed || cur.quizCompleted,
    quizScorePct: scorePct,
    completedAt: completed ? new Date().toISOString() : cur.completedAt,
  };
  store[mapId] = next;
  writeStore(store);
  syncMap(mapId, next);
}

export function markPathTreeCompleted(mapId: string) {
  const store = readStore();
  const cur = store[mapId] ?? defaultProgress();
  const next = { ...cur, visited: true, pathTreeCompleted: true };
  store[mapId] = next;
  writeStore(store);
  syncMap(mapId, next);
}

/** @deprecated Vignette kaldırıldı */
export function markVignetteDone() {
  /* no-op */
}

export function prerequisitesMet(prerequisites: string[]): boolean {
  if (prerequisites.length === 0) return true;
  const store = readStore();
  return prerequisites.every((id) => store[id]?.quizCompleted === true);
}

export function isMapCompleted(mapId: string): boolean {
  return getMapProgress(mapId).quizCompleted;
}

export function getOverallProgress(mapIds: string[]): {
  completed: number;
  total: number;
  pct: number;
} {
  const total = mapIds.length;
  const completed = mapIds.filter((id) => isMapCompleted(id)).length;
  return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export function readPharmaProgressStore(): ProgressStore {
  return readStore();
}
