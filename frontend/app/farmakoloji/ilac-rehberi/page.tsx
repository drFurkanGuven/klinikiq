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
  unionKeys,
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
  GitCompare,
  History,
  X,
  Trash2,
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

  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareRows, setCompareRows] = useState<[TurkishMedicineRecord, TurkishMedicineRecord] | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TurkishMedicineRecord | null>(null);
  const [openFields, setOpenFields] = useState<Record<string, boolean>>({});
  const [atlas, setAtlas] = useState<IlacAtlasResponse | null>(null);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasNotice, setAtlasNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (compareIds.length !== 2) {
      setCompareRows(null);
      setCompareError(null);
      return;
    }
    const [i1, i2] = compareIds;
    let cancelled = false;
    setCompareLoading(true);
    setCompareError(null);
    setCompareRows(null);
    (async () => {
      try {
        const [a, b] = await Promise.all([pharmacologyApi.medicine(i1), pharmacologyApi.medicine(i2)]);
        if (!cancelled) setCompareRows([a.data, b.data]);
      } catch (err: unknown) {
        const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        if (!cancelled) setCompareError(typeof d === "string" ? d : "Karşılaştırma yüklenemedi.");
      } finally {
        if (!cancelled) setCompareLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compareIds]);

  useEffect(() => {
    if (!detail) {
      setAtlas(null);
      setAtlasNotice(null);
      return;
    }
    const bc = titckBarcode(detail);
    if (!bc) {
      setAtlas(null);
      setAtlasNotice(null);
      return;
    }
    let cancelled = false;
    setAtlasLoading(true);
    setAtlasNotice(null);
    setAtlas(null);
    pharmacologyApi
      .atlasByBarcode(bc)
      .then((res) => {
        if (!cancelled) setAtlas(res.data);
      })
      .catch((err: unknown) => {
        const ax = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = ax.response?.status;
        const msg = ax.response?.data?.detail;
        if (status === 404) {
          if (!cancelled) setAtlasNotice("Bu barkod için Tıp Atlası metni yok.");
        } else if (status === 503) {
          if (!cancelled) setAtlasNotice(typeof msg === "string" ? msg : "Atlas veritabanı yapılandırılmamış.");
        } else if (!cancelled) {
          setAtlasNotice(typeof msg === "string" ? msg : "Kullanma metni alınamadı.");
        }
      })
      .finally(() => {
        if (!cancelled) setAtlasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1]!, id];
    });
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
          Türkiye ruhsat listesi alanları (TİTCK kaynaklı). Ürün bilgilendirme metni veya tedavi önerisi değildir.
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

          {compareIds.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl border text-sm"
              style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
            >
              <GitCompare className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
              <span className="font-bold">
                {compareIds.length === 1 ? "Karşılaştırma için bir kayıt daha seçin." : "İki ürün yüklendi — aşağıda tablo."}
              </span>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="ml-auto inline-flex items-center gap-1 text-xs font-black uppercase px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <X className="w-3.5 h-3.5" />
                Sıfırla
              </button>
            </div>
          )}

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
                {totalHits} sonuç · sayfa {searchPage}/{totalPages}
              </p>
              <ul className="flex flex-col gap-2">
                {searchResults.map((r, idx) => {
                  const id = typeof r.id === "number" ? r.id : Number(r.id);
                  const sheetName = typeof r._sheet === "string" ? r._sheet : "";
                  const ok = Number.isFinite(id);
                  const checked = ok && compareIds.includes(id);
                  return (
                    <li
                      key={`${sheetName}-${id}-${idx}`}
                      className="rounded-2xl border flex overflow-hidden"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <label className="flex items-center px-3 border-r cursor-pointer shrink-0" style={{ borderColor: "var(--border)" }}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded"
                          disabled={!ok}
                          checked={checked}
                          onChange={() => ok && toggleCompare(id)}
                          title="Karşılaştır (en fazla 2)"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!ok}
                        onClick={() => ok && loadDetail(id)}
                        className="flex-1 text-left px-4 py-3 text-sm font-bold transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
                        style={{ color: "var(--text)" }}
                      >
                        <span className="block">{turkishDrugTitle(r)}</span>
                        <span className="text-[11px] font-semibold opacity-50" style={{ color: "var(--text-muted)" }}>
                          id {ok ? id : "?"}
                          {sheetName ? ` · ${sheetName}` : ""}
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

          {compareLoading && (
            <div className="flex items-center gap-3 py-6 justify-center opacity-70">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold">Karşılaştırma yükleniyor…</span>
            </div>
          )}

          {compareError && (
            <div
              className="flex items-start gap-2 text-sm font-medium px-4 py-3 rounded-2xl border mb-4"
              style={{
                borderColor: "var(--border)",
                color: "var(--warning, #b45309)",
                background: "color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent)",
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {compareError}
            </div>
          )}

          {compareRows && !compareLoading && (
            <div className="mb-8 overflow-x-auto border rounded-2xl" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
                <thead>
                  <tr style={{ background: "var(--bg)" }}>
                    <th className="p-3 font-black border-b" style={{ borderColor: "var(--border)" }}>
                      Alan
                    </th>
                    <th className="p-3 font-black border-b w-[36%]" style={{ borderColor: "var(--border)" }}>
                      {turkishDrugTitle(compareRows[0])}
                    </th>
                    <th className="p-3 font-black border-b w-[36%]" style={{ borderColor: "var(--border)" }}>
                      {turkishDrugTitle(compareRows[1])}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unionKeys(compareRows[0], compareRows[1]).map((key) => (
                    <tr key={key} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="p-3 font-bold align-top whitespace-nowrap" style={{ color: "var(--text)" }}>
                        {key}
                      </td>
                      <td className="p-3 align-top break-words" style={{ color: "var(--text-muted)" }}>
                        {formatCell(compareRows[0][key])}
                      </td>
                      <td className="p-3 align-top break-words" style={{ color: "var(--text-muted)" }}>
                        {formatCell(compareRows[1][key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="space-y-4 mt-4 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              {atlasLoading && (
                <div className="flex items-center gap-2 text-sm font-medium opacity-70">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />
                  Kullanma talimatı (Tıp Atlası) aranıyor…
                </div>
              )}
              {atlasNotice && !atlasLoading && (
                <p className="text-xs font-medium rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  {atlasNotice}
                </p>
              )}
              {atlas?.description && !atlasLoading && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <div className="px-4 py-3 border-b font-black text-sm" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    Kullanma talimatı (Tıp Atlası veri seti)
                  </div>
                  <p className="text-[10px] px-4 pt-3 font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {atlas.disclaimer}
                  </p>
                  <div
                    className="p-4 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words max-h-[min(70vh,560px)] overflow-y-auto"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {atlas.description}
                  </div>
                </div>
              )}
              <h3 className="text-sm font-black flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Pill className="w-4 h-4" style={{ color: "var(--primary)" }} />
                Seçilen kayıt (TİTCK alanları)
              </h3>
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
      </main>

      <Footer />
    </div>
  );
}
