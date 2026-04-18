"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pharmacologyApi, type TurkishMedicineRecord } from "@/lib/api";
import {
  ArrowLeft,
  LogOut,
  Pill,
  FlaskConical,
  Activity,
  Syringe,
  HeartPulse,
  Shield,
  BookOpen,
  Sparkles,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

function turkishDrugTitle(row: Record<string, unknown>): string {
  const keys = ["İlaç Adı", "Ürün Adı", "Etken Madde"];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const id = row.id;
  return typeof id === "number" ? `Kayıt #${id}` : "İsimsiz kayıt";
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function sortedDetailKeys(obj: TurkishMedicineRecord): string[] {
  return Object.keys(obj).sort((a, b) => {
    const pri = (k: string) => (k === "id" ? 0 : k === "_sheet" ? 1 : 2);
    const pa = pri(a);
    const pb = pri(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, "tr");
  });
}

const UNITS = [
  {
    icon: Activity,
    title: "Farmakokinetik",
    desc: "Emilim, dağılım, metabolizma ve eliminasyon (ADME); biyoyararlanım, yarı ömür, doz aralığı ve kinetik eğriler.",
  },
  {
    icon: FlaskConical,
    title: "Farmakodinami",
    desc: "Doz-etki ilişkisi, agonist/antagonist kavramları, tolerans ve duyarlılık; terapötik ve toksik doz aralıkları.",
  },
  {
    icon: Pill,
    title: "Reseptörler ve sinyal yolu",
    desc: "G protein bağlı reseptörler, iyon kanalları, enzim bağlı hedefler; ilaçların seçici ve yan etki profilleri.",
  },
  {
    icon: Syringe,
    title: "İlaç grupları (özet)",
    desc: "Analjezikler, antimikrobiyaller, kardiyovasküler ve santral sinir sistemi ilaçları gibi başlıklar; TUS müfredatıyla paralel çalışma.",
  },
  {
    icon: HeartPulse,
    title: "Klinik farmakoloji",
    desc: "Etkileşimler, kontrendikasyonlar, gebelik/emzirme ve doz ayarlama (böbrek/karaciğer yetmezliği).",
  },
  {
    icon: Shield,
    title: "Güvenlilik",
    desc: "Yan etkiler, advers reaksiyon raporlama ve akılcı ilaç kullanımına giriş.",
  },
] as const;

export default function FarmakolojiPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHits, setTotalHits] = useState(0);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TurkishMedicineRecord | null>(null);
  const [openFields, setOpenFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji");
    }
  }, [mounted, router]);

  async function runSearch(page: number) {
    const q = query.trim();
    if (q.length < 2) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setDetail(null);
    setDetailError(null);
    try {
      const res = await pharmacologyApi.search(q, page, 25);
      setSearchResults(res.data.data);
      setSearchPage(res.data.page);
      setTotalPages(res.data.totalPages);
      setTotalHits(res.data.total);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSearchError(typeof detail === "string" ? detail : "Arama başarısız. Bağlantıyı deneyin.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    void runSearch(1);
  }

  async function loadDetail(id: number) {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setOpenFields({});
    try {
      const res = await pharmacologyApi.medicine(id);
      setDetail(res.data);
      const keys = sortedDetailKeys(res.data);
      const open: Record<string, boolean> = {};
      keys.forEach((k, i) => {
        open[k] = i < 8;
      });
      setOpenFields(open);
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setDetailError(typeof d === "string" ? d : "Kayıt yüklenemedi.");
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleField(key: string) {
    setOpenFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                style={{ background: "var(--primary)" }}
              >
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Farmakoloji</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">TUS · Temel bilimler</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <ThemeToggle />
            <div className="w-px h-6 bg-current opacity-10 hidden sm:block" />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold transition-all px-3 sm:px-4 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div
          className="rounded-3xl border p-6 sm:p-10 mb-10 shadow-xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)" }}
            >
              <BookOpen className="w-7 h-7" style={{ color: "var(--primary)" }} />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                Farmakoloji çalışma alanı
              </h1>
              <p className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Arama, TİTCK ilaç listesini kullanan yerel{" "}
                <a
                  href="https://github.com/tugcantopaloglu/turkish-medicine-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  turkish-medicine-api
                </a>{" "}
                üzerinden yapılır (backend proxy). Ruhsat ve liste alanları; ürün etiketi metni değildir.
              </p>
              <div
                className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border"
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "var(--primary)",
                }}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                API çalışmıyorsa backend’de TURKISH_MEDICINE_API_URL ve turkish-medicine-api (npm start) gerekir.
              </div>
            </div>
          </div>
        </div>

        <section
          className="rounded-3xl border p-6 sm:p-8 mb-10 shadow-lg"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--text)" }}>
              TİTCK ilaç araması
            </h2>
          </div>
          <p className="text-xs font-medium mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Veri kaynağı: TİTCK yayınları (API üzerinden). Sonuçlar sayfalanır; yoğun sorgularda yanıt gecikebilir.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Örn. parol, metformin, barkod"
                className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold border outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] transition"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading || query.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wide text-white transition disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Ara
            </button>
          </form>

          {searchError && (
            <div
              className="flex items-start gap-2 text-sm font-medium px-4 py-3 rounded-2xl border mb-4"
              style={{
                borderColor: "var(--border)",
                color: "var(--error, #b91c1c)",
                background: "color-mix(in srgb, var(--error, #ef4444) 8%, transparent)",
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              {searchError}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">
                {totalHits} sonuç — satıra tıklayın (sayfa {searchPage}/{totalPages})
              </p>
              <ul className="flex flex-col gap-2">
                {searchResults.map((r, idx) => {
                  const id = typeof r.id === "number" ? r.id : Number(r.id);
                  const sheet = typeof r._sheet === "string" ? r._sheet : "";
                  return (
                    <li key={`${sheet}-${id}-${idx}`}>
                      <button
                        type="button"
                        disabled={!Number.isFinite(id)}
                        onClick={() => loadDetail(id)}
                        className="w-full text-left rounded-2xl border px-4 py-3 text-sm font-bold transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <span className="block">{turkishDrugTitle(r)}</span>
                        <span className="text-[11px] font-semibold opacity-50" style={{ color: "var(--text-muted)" }}>
                          id {Number.isFinite(id) ? id : "?"}
                          {sheet ? ` · ${sheet}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {totalPages > 1 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={searchLoading || searchPage <= 1}
                    onClick={() => void runSearch(searchPage - 1)}
                    className="text-xs font-black uppercase tracking-wide px-4 py-2 rounded-xl border disabled:opacity-40"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    disabled={searchLoading || searchPage >= totalPages}
                    onClick={() => void runSearch(searchPage + 1)}
                    className="text-xs font-black uppercase tracking-wide px-4 py-2 rounded-xl border disabled:opacity-40"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </div>
          )}

          {detailLoading && (
            <div className="flex items-center gap-3 py-8 justify-center opacity-70">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold">Kayıt yükleniyor…</span>
            </div>
          )}

          {detailError && (
            <div
              className="flex items-start gap-2 text-sm font-medium px-4 py-3 rounded-2xl border"
              style={{
                borderColor: "var(--border)",
                color: "var(--warning, #b45309)",
                background: "color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent)",
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {detailError}
            </div>
          )}

          {detail && !detailLoading && (
            <div className="space-y-4 mt-2 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <p className="text-[11px] font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                TİTCK liste alanları — tıbbi karar için yeterli değildir; resmi ürün bilgisine başvurun.
              </p>
              <div className="space-y-2">
                {sortedDetailKeys(detail).map((key) => {
                  const open = openFields[key] ?? false;
                  const val = formatCell(detail[key]);
                  return (
                    <div
                      key={key}
                      className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleField(key)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-bold text-sm"
                        style={{ color: "var(--text)" }}
                      >
                        <span className="truncate">{key}</span>
                        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>
                      {open && (
                        <div
                          className="px-4 pb-4 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto border-t"
                          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                        >
                          {val}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <h2 className="text-xs font-black uppercase tracking-widest mb-4 px-1" style={{ color: "var(--text-muted)" }}>
          Müfredat çerçevesi
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {UNITS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
                <div className="space-y-2 min-w-0">
                  <h3 className="font-black text-base leading-snug" style={{ color: "var(--text)" }}>
                    {title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div
          className="mt-10 rounded-2xl border px-5 py-4 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <strong style={{ color: "var(--text)" }}>Not:</strong> Tıbbi tedavi kararları bu uygulamadan verilmez; yalnızca eğitim
          amaçlı özet bilgi sunulur.
        </div>
      </main>

      <Footer />
    </div>
  );
}
