import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { BASE_URL, type PracticeMcqItem } from "./api";
import { storage } from "./storage";

const QUESTIONS_FILE =
  (FileSystem.documentDirectory ?? "") + "practice_mcq.json";
const META_KEY = "practice_mcq_meta";

export async function getLocalVersion(): Promise<{
  version: string;
  total: number;
} | null> {
  const raw = await AsyncStorage.getItem(META_KEY);
  return raw ? (JSON.parse(raw) as { version: string; total: number }) : null;
}

export async function downloadAndSave(): Promise<string> {
  const token = await storage.getToken();
  if (!token) {
    throw new Error("Oturum bulunamadı; lütfen tekrar giriş yapın.");
  }

  const result = await FileSystem.downloadAsync(
    `${BASE_URL}/practice-mcq/all`,
    QUESTIONS_FILE,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (result.status !== 200) {
    throw new Error("İndirme başarısız: " + result.status);
  }

  const raw = await FileSystem.readAsStringAsync(QUESTIONS_FILE);
  const data = JSON.parse(raw) as {
    version: string;
    total: number;
    questions: PracticeMcqItem[];
  };

  await AsyncStorage.setItem(
    META_KEY,
    JSON.stringify({ version: data.version, total: data.total })
  );

  return data.version;
}

async function loadAll(): Promise<PracticeMcqItem[]> {
  const info = await FileSystem.getInfoAsync(QUESTIONS_FILE);
  if (!info.exists) return [];
  const raw = await FileSystem.readAsStringAsync(QUESTIONS_FILE);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as PracticeMcqItem[];
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "questions" in parsed &&
      Array.isArray((parsed as { questions: unknown }).questions)
    ) {
      return (parsed as { questions: PracticeMcqItem[] }).questions;
    }
    return [];
  } catch {
    return [];
  }
}

/** Step: "all" | "step1" | "step2&3" — web `matchesUsmleFilter` ile uyumlu. */
function matchesFilter(
  q: PracticeMcqItem,
  specialty: string,
  step: string
): boolean {
  if (step === "step1") {
    return q.meta_info === "step1";
  }
  if (step === "step2&3") {
    if (q.meta_info !== "step2&3") return false;
    if (specialty) return q.specialty === specialty;
    return true;
  }
  if (step === "all" || !step) {
    if (specialty) return q.specialty === specialty;
    return true;
  }
  return true;
}

export async function getRandom(filters: {
  specialty?: string;
  step?: string;
}): Promise<PracticeMcqItem | null> {
  const all = await loadAll();
  if (!all.length) return null;
  const step = filters.step && filters.step !== "all" ? filters.step : "all";
  const specialty =
    step === "step1" ? "" : (filters.specialty ?? "");
  const pool = all.filter((q) => matchesFilter(q, specialty, step));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export async function getStats(): Promise<{
  total: number;
  by_specialty: Record<string, number>;
  by_step: Record<string, number>;
} | null> {
  const questions = await loadAll();
  if (!questions.length) return null;
  const by_specialty: Record<string, number> = {};
  const by_step: Record<string, number> = {};
  for (const q of questions) {
    const s = q.specialty || "other";
    by_specialty[s] = (by_specialty[s] || 0) + 1;
    const st = q.meta_info || "other";
    by_step[st] = (by_step[st] || 0) + 1;
  }
  return { total: questions.length, by_specialty, by_step };
}
