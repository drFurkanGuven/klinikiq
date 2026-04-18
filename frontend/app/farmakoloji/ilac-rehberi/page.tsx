"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pharmacologyApi, type TurkishMedicineRecord, type IlacAtlasResponse } from "@/lib/api";
import {
  TITCK_SHEET_FILTERS,
  turkishDrugTitle,
  titckBarcode,
  formatCell,
  sortedDetailKeys,
  loadRecentSearches,
  pushRecentSearch,
  clearRecentSearches,
  type IlacRehberiRecent,
} from "@/lib/turkishMedicineHelpers";
import {
  ArrowLeft,
  LogOut,
  Pill,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  History,
  Trash2,
  FileText,
} from "lucide-react";

export default function IlacRehberiPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHits, setTotalHits] = useState(0);

  const [recent, setRecent] = useState<IlacRehberiRecent[]>([]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TurkishMedicineRecord | null>(null);
  const [openFields, setOpenFields] = useState<Record<string, boolean>>({});
  const [atlas, setAtlas] = useState<IlacAtlasResponse | null>(null);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasNotice, setAtlasNotice] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  /** Tıklanınca prospektüs hemen gösterilsin; TİTCK detayı ayrı yüklensin */
  const [activeDrugId, setActiveDrugId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/ilac-rehberi");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;
    setRecent(loadRecentSearches());
  }, [mounted]);

  async function fetchAtlasByBarcode(bc: string) {
    setAtlasLoading(true);
    setAtlasNotice(null);
    setAtlas(null);
    try {
      const res = await pharmacologyApi.atlasByBarcode(bc);
      setAtlas(res.data);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = ax.response?.status;
      const msg = ax.response?.data?.detail;
      if (status === 404) {
        setAtlasNotice("Bu ürün için prospektüs metni (Tıp Atlası) bulunamadı.");
      } else if (status === 503) {
        setAtlasNotice(typeof msg === "string" ? msg : "Atlas veritabanı yapılandırılmamış.");
      } else {
        setAtlasNotice(typeof msg === "string" ? msg : "Prospektüs yüklenemedi.");
      }
    } finally {
      setAtlasLoading(false);
    }
  }

  async function runSearch(page: number, qOverride?: string, sheetOverride?: string) {
    const q = (qOverride ?? query).trim();
    const sh = sheetOverride !== undefined ? sheetOverride : sheet;
    if (q.length < 2) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setDetail(null);
    setDetailError(null);
    setAtlas(null);
    setAtlasNotice(null);
    setSelectedTitle(null);
    setActiveDrugId(null);
    try {
      const res = await pharmacologyApi.search(q, page, 25, sh || undefined);
      setSearchResults(res.data.data);
      setSearchPage(res.data.page);
      setTotalPages(res.data.totalPages);
      setTotalHits(res.data.total);
      pushRecentSearch(q, sh);
      setRecent(loadRecentSearches());
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

  function applyRecent(r: IlacRehberiRecent) {
    setQuery(r.q);
    setSheet(r.sheet);
    void runSearch(1, r.q, r.sheet);
  }

  async function openDrug(id: number, rowFromList: Record<string, unknown>) {
    setActiveDrugId(id);
    setSelectedTitle(turkishDrugTitle(rowFromList));
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setOpenFields({});
    setAtlas(null);
    setAtlasNotice(null);

    const bcFromList = titckBarcode(rowFromList);
    if (bcFromList) {
      void fetchAtlasByBarcode(bcFromList);
    } else {
      setAtlasLoading(false);
    }

    try {
      const res = await pharmacologyApi.medicine(id);
      setDetail(res.data);
      const keys = sortedDetailKeys(res.data);
      const open: Record<string, boolean> = {};
      keys.forEach((k) => {
        open[k] = false;
      });
      setOpenFields(open);

      if (!bcFromList) {
        const bc = titckBarcode(res.data);
        if (bc) {
          void fetchAtlasByBarcode(bc);
        } else {
          setAtlasNotice("Bu kayıtta barkod yok; prospektüs eşlenemiyor.");
        }
      }
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/farmakoloji"
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
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">İlaç rehberi</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">TİTCK · Farmakoloji</span>
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Sonuçlardan bir ilaç adına tıklayın: aşağıda <strong style={{ color: "var(--text)" }}>prospektüs</strong> (Tıp Atlası
          kullanma talimatı) açılır; liste alanları isteğe bağlı olarak genişletilebilir.
        </p>

        {recent.length > 0 && (
          <section
            className="rounded-2xl border p-4 sm:p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60">
                <History className="w-4 h-4" />
                Son arananlar
              </div>
              <button
                type="button"
                onClick={() => {
                  clearRecentSearches();
                  setRecent([]);
                }}
                className="text-[11px] font-bold flex items-center gap-1 opacity-60 hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Temizle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button
                  key={`${r.q}-${r.sheet}-${r.at}`}
                  type="button"
                  onClick={() => applyRecent(r)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {r.q}
                  {r.sheet ? (
                    <span className="opacity-50 font-normal"> · {TITCK_SHEET_FILTERS.find((s) => s.value === r.sheet)?.label ?? r.sheet}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        )}

        <section
          className="rounded-3xl border p-6 sm:p-8 shadow-lg"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <form onSubmit={handleSearch} className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative min-w-0">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="İlaç adı, etken madde veya barkod"
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wide text-white transition disabled:opacity-50 shrink-0"
                style={{ background: "var(--primary)" }}
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Ara
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest opacity-50 shrink-0">Liste filtresi</label>
              <select
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
                className="w-full sm:max-w-md rounded-xl border px-3 py-2.5 text-sm font-semibold"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {TITCK_SHEET_FILTERS.map((opt) => (
                  <option key={opt.label + opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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
                {totalHits} sonuç · sayfa {searchPage}/{totalPages} — ilaç adına tıklayın
              </p>
              <ul className="flex flex-col gap-2">
                {searchResults.map((r, idx) => {
                  const id = typeof r.id === "number" ? r.id : Number(r.id);
                  const sheetName = typeof r._sheet === "string" ? r._sheet : "";
                  const ok = Number.isFinite(id);
                  return (
                    <li key={`${sheetName}-${id}-${idx}`}>
                      <button
                        type="button"
                        disabled={!ok}
                        onClick={() => ok && openDrug(id, r)}
                        className="w-full text-left rounded-2xl border px-4 py-3 text-sm font-bold transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <span className="block">{turkishDrugTitle(r)}</span>
                        <span className="text-[11px] font-semibold opacity-50" style={{ color: "var(--text-muted)" }}>
                          {sheetName ? `${sheetName}` : ""}
                          {sheetName ? " · " : ""}barkod: {titckBarcode(r) ?? "—"}
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

          {detailError && activeDrugId !== null && (
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

          {activeDrugId !== null && (
            <div className="space-y-5 mt-4 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                  {selectedTitle ?? (detail ? turkishDrugTitle(detail) : "…")}
                </h2>
                {detail && atlas?.product_name && atlas.product_name !== selectedTitle ? (
                  <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Ürün (atlas): {atlas.product_name}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div
                  className="px-4 py-3 border-b font-black text-sm flex items-center gap-2"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
                  Prospektüs (kullanma talimatı)
                </div>
                {atlasLoading && (
                  <div className="flex items-center gap-2 px-4 py-8 text-sm font-medium justify-center opacity-80">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
                    Prospektüs yükleniyor…
                  </div>
                )}
                {!atlasLoading && atlasNotice && (
                  <p className="text-sm font-medium px-4 py-6" style={{ color: "var(--text-muted)" }}>
                    {atlasNotice}
                  </p>
                )}
                {!atlasLoading && atlas?.description && (
                  <>
                    <p className="text-[10px] px-4 pt-3 font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {atlas.disclaimer}
                    </p>
                    <div
                      className="p-4 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words max-h-[min(75vh,640px)] overflow-y-auto"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {atlas.description}
                    </div>
                  </>
                )}
              </div>

              {detailLoading && (
                <div className="flex items-center gap-2 text-sm font-medium opacity-70 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />
                  Liste bilgileri yükleniyor…
                </div>
              )}

              {detail && !detailLoading && (
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2 mb-3" style={{ color: "var(--text)" }}>
                    <Pill className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    TİTCK liste bilgileri
                  </h3>
                  <p className="text-[11px] font-medium mb-3" style={{ color: "var(--text-muted)" }}>
                    Ruhsat listesinden gelen alanlar; satıra tıklayarak açın.
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
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
