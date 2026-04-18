import type { TurkishMedicineRecord } from "@/lib/api";

/** Upstream turkish-medicine-api ile aynı sayfa adları (sheet=) */
export const TITCK_SHEET_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tüm listeler" },
  { value: "AKTİF ÜRÜNLER LİSTESİ", label: "Aktif ürünler" },
  { value: "PASİF ÜRÜNLER LİSTESİ", label: "Pasif ürünler" },
  { value: "PASİFE ALINACAK ÜRÜNLER", label: "Pasife alınacak ürünler" },
  { value: "LİSTEYE YENİ EKLENEN ÜRÜNLER", label: "Yeni eklenenler" },
  { value: "DEĞİŞİKLİK YAPILAN ÜRÜNLER", label: "Değişiklik yapılanlar" },
];

export const ILAC_REHBERI_RECENT_KEY = "klinikiq_ilac_rehberi_recent_v1";

export type IlacRehberiRecent = { q: string; sheet: string; at: number };

const MAX_RECENT = 10;

export function turkishDrugTitle(row: Record<string, unknown>): string {
  const keys = ["İlaç Adı", "Ürün Adı", "Etken Madde"];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const id = row.id;
  return typeof id === "number" ? `Kayıt #${id}` : "İsimsiz kayıt";
}

export function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export function sortedDetailKeys(obj: TurkishMedicineRecord): string[] {
  return Object.keys(obj).sort((a, b) => {
    const pri = (k: string) => (k === "id" ? 0 : k === "_sheet" ? 1 : 2);
    const pa = pri(a);
    const pb = pri(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, "tr");
  });
}

export function loadRecentSearches(): IlacRehberiRecent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ILAC_REHBERI_RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is IlacRehberiRecent =>
          x &&
          typeof x === "object" &&
          typeof (x as IlacRehberiRecent).q === "string" &&
          typeof (x as IlacRehberiRecent).at === "number"
      )
      .map((x) => ({ q: x.q, sheet: typeof x.sheet === "string" ? x.sheet : "", at: x.at }))
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentSearch(q: string, sheet: string): void {
  if (typeof window === "undefined") return;
  const trimmed = q.trim();
  if (trimmed.length < 2) return;
  const prev = loadRecentSearches().filter((r) => !(r.q === trimmed && r.sheet === sheet));
  const next: IlacRehberiRecent[] = [{ q: trimmed, sheet, at: Date.now() }, ...prev].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(ILAC_REHBERI_RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ILAC_REHBERI_RECENT_KEY);
  } catch {
    /* */
  }
}

/** İki TİTCK kaydı için birleşik alan anahtarları (karşılaştırma tablosu). */
export function unionKeys(a: TurkishMedicineRecord, b: TurkishMedicineRecord): string[] {
  const s = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...s].sort((x, y) => {
    const pri = (k: string) => (k === "id" ? 0 : k === "_sheet" ? 1 : 2);
    const d = pri(x) - pri(y);
    if (d !== 0) return d;
    return x.localeCompare(y, "tr");
  });
}
