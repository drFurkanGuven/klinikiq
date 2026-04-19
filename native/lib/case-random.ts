import AsyncStorage from "@react-native-async-storage/async-storage";

/** Web dashboard ile aynı API değerleri */
export const CASE_SPECIALTIES = [
  { value: "cardiology", label: "Kardiyoloji" },
  { value: "endocrinology", label: "Endokrinoloji" },
  { value: "neurology", label: "Nöroloji" },
  { value: "pulmonology", label: "Pulmonoloji" },
  { value: "gastroenterology", label: "Gastroenteroloji" },
  { value: "nephrology", label: "Nefroloji" },
  { value: "infectious_disease", label: "Enfeksiyon" },
  { value: "hematology", label: "Hematoloji" },
  { value: "rheumatology", label: "Romatoloji" },
] as const;

export const CASE_DIFFICULTIES = [
  { value: "", label: "Tümü" },
  { value: "easy", label: "Kolay" },
  { value: "medium", label: "Orta" },
  { value: "hard", label: "Zor" },
] as const;

const PREFS_KEY = "klinikiq_case_random_prefs_v1";

export type CaseRandomPrefs = {
  specialtyValues: string[];
  difficulty: string;
};

const defaultPrefs = (): CaseRandomPrefs => ({
  specialtyValues: [],
  difficulty: "",
});

export async function loadCaseRandomPrefs(): Promise<CaseRandomPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();
    const p = JSON.parse(raw) as Partial<CaseRandomPrefs>;
    return {
      specialtyValues: Array.isArray(p.specialtyValues)
        ? p.specialtyValues.filter((x) => typeof x === "string")
        : [],
      difficulty: typeof p.difficulty === "string" ? p.difficulty : "",
    };
  } catch {
    return defaultPrefs();
  }
}

export async function saveCaseRandomPrefs(prefs: CaseRandomPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
