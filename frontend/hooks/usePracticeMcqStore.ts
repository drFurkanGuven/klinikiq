"use client";

import { useMemo } from "react";
import type { PracticeMcqAllItem } from "@/lib/api";

export const DB_NAME = "klinikiq_practice";
const DB_VERSION = 1;
export const STORE_NAME = "questions";
const STORE_META = "meta";
export const META_KEY = "catalog_meta";

export type CatalogMetaRow = {
  key: typeof META_KEY;
  version: string;
  total: number;
};

function idbOpen(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB kullanılamıyor"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
  });
}

/** IndexedDB aç; `questions` object store (keyPath: `id`), `meta` store (keyPath: `key`). */
export async function openDB(): Promise<IDBDatabase> {
  return idbOpen();
}

/** Meta kaydından `{ version, total }` veya yoksa `null`. */
export async function getLocalVersion(): Promise<{
  version: string;
  total: number;
} | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(META_KEY);
    req.onsuccess = () => {
      const v = req.result as CatalogMetaRow | undefined;
      if (!v || typeof v.version !== "string") {
        resolve(null);
        return;
      }
      resolve({ version: v.version, total: typeof v.total === "number" ? v.total : 0 });
    };
    req.onerror = () => reject(req.error);
  });
}

/** Tüm soruları yazar ve meta sürümünü günceller. */
export async function saveAll(
  questions: PracticeMcqAllItem[],
  version: string
): Promise<void> {
  const db = await idbOpen();
  const total = questions.length;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, STORE_META], "readwrite");
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"));
    tx.oncomplete = () => resolve();
    const qStore = tx.objectStore(STORE_NAME);
    const mStore = tx.objectStore(STORE_META);
    qStore.clear();
    for (const q of questions) {
      qStore.put(q);
    }
    mStore.put({ key: META_KEY, version, total } satisfies CatalogMetaRow);
  });
}

export async function getAllQuestions(): Promise<PracticeMcqAllItem[]> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as PracticeMcqAllItem[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

/** USMLE sayfa filtreleriyle uyumlu (Step 1’de branş yok). */
export function matchesUsmleFilter(
  row: Pick<PracticeMcqAllItem, "specialty" | "meta_info">,
  specialty: string,
  step: string
): boolean {
  if (step === "step1") {
    return row.meta_info === "step1";
  }
  if (step === "step2&3") {
    if (row.meta_info !== "step2&3") return false;
    if (specialty) return row.specialty === specialty;
    return true;
  }
  if (specialty) {
    return row.specialty === specialty;
  }
  return true;
}

/** Filtrelenmiş soru listesi (getAll + JS filter). */
export async function getFiltered(filters: {
  specialty: string;
  step: string;
}): Promise<PracticeMcqAllItem[]> {
  const all = await getAllQuestions();
  return all.filter((row) =>
    matchesUsmleFilter(row, filters.specialty, filters.step)
  );
}

function shufflePick<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const j = Math.floor(Math.random() * items.length);
  return items[j] ?? null;
}

/** Filtre → rastgele bir soru (shuffle eşdeğeri: rastgele indeks). */
export async function getRandom(filters: {
  specialty: string;
  step: string;
}): Promise<PracticeMcqAllItem | null> {
  const list = await getFiltered(filters);
  return shufflePick(list);
}

export function buildStatsFromQuestions(questions: PracticeMcqAllItem[]): {
  total: number;
  by_specialty: Record<string, number>;
  by_step: Record<string, number>;
} {
  const by_specialty: Record<string, number> = {};
  const by_step: Record<string, number> = {};
  for (const q of questions) {
    const s = q.specialty || "other";
    by_specialty[s] = (by_specialty[s] ?? 0) + 1;
    const st = q.meta_info || "other";
    by_step[st] = (by_step[st] ?? 0) + 1;
  }
  return { total: questions.length, by_specialty, by_step };
}

export function usePracticeMcqStore() {
  const api = useMemo(
    () => ({
      openDB,
      getLocalVersion,
      saveAll,
      getFiltered,
      getRandom,
      getAllQuestions,
      buildStatsFromQuestions,
      matchesUsmleFilter,
    }),
    []
  );
  return api;
}
