import AsyncStorage from "@react-native-async-storage/async-storage";
import { pharmaProgressApi, type PharmaMapProgressPatch } from "./api";
import { storage } from "./storage";

const STORAGE_KEY = "klinikiq_pharma_progress_v1";

export interface PharmaMapProgress {
  visited: boolean;
  quizCompleted: boolean;
  quizScorePct: number | null;
  pathTreeCompleted: boolean;
  completedAt: string | null;
}

type ProgressStore = Record<string, PharmaMapProgress>;

let hydratePromise: Promise<ProgressStore> | null = null;

export function resetPharmaProgressHydration() {
  hydratePromise = null;
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

async function readLocalStore(): Promise<ProgressStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

async function writeLocalStore(store: ProgressStore) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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

function clientToPatch(p: PharmaMapProgress): PharmaMapProgressPatch {
  return {
    visited: p.visited || undefined,
    quiz_completed: p.quizCompleted || undefined,
    quiz_score_pct: p.quizScorePct,
    path_tree_completed: p.pathTreeCompleted || undefined,
    completed_at: p.completedAt,
  };
}

/** Sunucu + AsyncStorage birleştir (İlerleme sekmesi için). */
export async function ensurePharmaProgressHydrated(): Promise<ProgressStore> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const local = await readLocalStore();
      const token = await storage.getToken();
      if (!token) return local;

      try {
        const res = await pharmaProgressApi.getProgress();
        const remote: ProgressStore = {};
        for (const row of res.data) {
          remote[row.map_id] = serverRowToClient(row);
        }
        const merged = mergeStores(local, remote);
        await writeLocalStore(merged);

        const toUpload: ProgressStore = {};
        for (const [mapId, prog] of Object.entries(merged)) {
          const hadRemote = mapId in remote;
          const hadLocal = mapId in local;
          if (
            hadLocal &&
            (!hadRemote || JSON.stringify(local[mapId]) !== JSON.stringify(remote[mapId]))
          ) {
            toUpload[mapId] = prog;
          }
        }
        if (Object.keys(toUpload).length > 0) {
          await Promise.all(
            Object.entries(toUpload).map(([mapId, prog]) =>
              pharmaProgressApi.patchProgress(mapId, clientToPatch(prog)).catch(() => {})
            )
          );
        }
        return merged;
      } catch {
        return local;
      }
    })();
  }
  return hydratePromise;
}

export async function readPharmaProgressStore(): Promise<ProgressStore> {
  return ensurePharmaProgressHydrated();
}

export function isMapCompletedFromStore(store: ProgressStore, mapId: string): boolean {
  return store[mapId]?.quizCompleted === true;
}

export function getOverallProgress(
  mapIds: string[],
  store: ProgressStore
): { completed: number; total: number; pct: number } {
  const total = mapIds.length;
  const completed = mapIds.filter((id) => isMapCompletedFromStore(store, id)).length;
  return {
    completed,
    total,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
