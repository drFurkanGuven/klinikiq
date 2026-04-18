"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  pharmacologyApi,
  type PharmacologyLabelResponse,
  type PharmacologySearchItem,
} from "@/lib/api";
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
  const [searchResults, setSearchResults] = useState<PharmacologySearchItem[]>([]);

  const [labelLoading, setLabelLoading] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelData, setLabelData] = useState<PharmacologyLabelResponse | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji");
    }
  }, [mounted, router]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setLabelData(null);
    setLabelError(null);
    try {
      const res = await pharmacologyApi.search(q);
      setSearchResults(res.data.results);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSearchError(typeof detail === "string" ? detail : "Arama başarısız. Bağlantıyı deneyin.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadLabel(rxcui: string) {
    setLabelLoading(true);
    setLabelError(null);
    setLabelData(null);
    setOpenSections({});
    try {
      const res = await pharmacologyApi.label(rxcui);
      setLabelData(res.data);
      const first: Record<string, boolean> = {};
      res.data.sections.forEach((s, i) => {
        first[s.key] = i < 3;
      });
      setOpenSections(first);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setLabelError(typeof detail === "string" ? detail : "Etiket yüklenemedi.");
    } finally {
      setLabelLoading(false);
    }
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
                Aşağıda ABD kaynaklı açık verilerle (NLM RxNorm + FDA openFDA) ilaç isminden arama yapabilirsiniz. Metinler
                İngilizce ve ABD etiketine özgüdür; Türkiye ürün bilgisi yerine geçmez.
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
                İleride flashcard / soru seti bu kayıtlara bağlanabilir.
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
              Canlı rehber (deneysel)
            </h2>
          </div>
          <p className="text-xs font-medium mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Kaynak: RxNorm (isim çözümleme) ve openFDA (FDA ilaç etiketi). Rate limit: yoğun kullanımda yavaşlayabilir.
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
                placeholder="Örn. metformin, aspirin, omeprazole"
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
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Sonuçlar — birine tıklayın</p>
              <ul className="flex flex-col gap-2">
                {searchResults.map((r) => (
                  <li key={r.rxcui}>
                    <button
                      type="button"
                      onClick={() => loadLabel(r.rxcui)}
                      className="w-full text-left rounded-2xl border px-4 py-3 text-sm font-bold transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      <span className="block">{r.name}</span>
                      <span className="text-[11px] font-semibold opacity-50" style={{ color: "var(--text-muted)" }}>
                        RxCUI {r.rxcui}
                        {r.tty ? ` · ${r.tty}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {labelLoading && (
            <div className="flex items-center gap-3 py-8 justify-center opacity-70">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold">FDA etiketi yükleniyor…</span>
            </div>
          )}

          {labelError && (
            <div
              className="flex items-start gap-2 text-sm font-medium px-4 py-3 rounded-2xl border"
              style={{
                borderColor: "var(--border)",
                color: "var(--warning, #b45309)",
                background: "color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent)",
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {labelError}
            </div>
          )}

          {labelData && !labelLoading && (
            <div className="space-y-4 mt-2 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <div className="space-y-1">
                {labelData.generic_names.length > 0 && (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    <span className="font-black" style={{ color: "var(--text)" }}>
                      Jenerik:
                    </span>{" "}
                    {labelData.generic_names.join(", ")}
                  </p>
                )}
                {labelData.brand_names.length > 0 && (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    <span className="font-black" style={{ color: "var(--text)" }}>
                      Marka:
                    </span>{" "}
                    {labelData.brand_names.slice(0, 8).join(", ")}
                    {labelData.brand_names.length > 8 ? "…" : ""}
                  </p>
                )}
                <p className="text-[11px] font-medium leading-relaxed pt-2" style={{ color: "var(--text-muted)" }}>
                  {labelData.disclaimer} — {labelData.source}
                </p>
              </div>

              <div className="space-y-2">
                {labelData.sections.map((sec) => {
                  const open = openSections[sec.key] ?? false;
                  return (
                    <div
                      key={sec.key}
                      className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(sec.key)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-bold text-sm"
                        style={{ color: "var(--text)" }}
                      >
                        {sec.title}
                        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>
                      {open && (
                        <div
                          className="px-4 pb-4 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words max-h-[50vh] overflow-y-auto border-t"
                          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                        >
                          {sec.text}
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
