"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  drugsApi,
  type DrugDetail,
  type DrugSummary,
} from "@/lib/api";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Pill,
  X,
} from "lucide-react";

const LIMIT = 25;
const RECENT_KEY = "kiq_drug_recent";
const MAX_RECENT = 5;

type RecentItem = { q: string; at: number };
type TabId = "genel" | "pk" | "etkilesim";

function loadRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as RecentItem[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentItem[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

function atcBadgeText(atc: string | null): string | null {
  if (!atc?.trim()) return null;
  const first = atc.trim().split(/\s+/)[0] ?? "";
  if (!first) return null;
  return first.length > 30 ? `${first.slice(0, 30)}…` : first;
}

function indicationPreview(s: string | null, max = 80): string {
  if (!s?.trim()) return "";
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function parseDrugbankIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/\s+/)) {
    const x = part.trim();
    if (!x) continue;
    const m = x.match(/^DB0*(\d+)$/i);
    if (m) seen.add(`DB${m[1].padStart(5, "0")}`);
  }
  return [...seen];
}

function IlaclarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);

  const [results, setResults] = useState<DrugSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DrugDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("genel");

  const [recent, setRecent] = useState<RecentItem[]>([]);

  const skipNextPageReset = useRef(false);

  useEffect(() => {
    setMounted(true);
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/ilaclar");
    }
  }, [mounted, router]);

  const drugParam = searchParams.get("drug");
  useEffect(() => {
    if (!mounted) return;
    if (drugParam?.trim()) {
      setSelectedId(drugParam.trim());
    }
  }, [mounted, drugParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      const d = query.trim();
      setDebouncedQuery(d);
      if (!skipNextPageReset.current) {
        setPage(1);
      }
      skipNextPageReset.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setTotal(0);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await drugsApi.search(debouncedQuery, page, LIMIT);
        if (cancelled) return;
        setResults(res.data.results);
        setTotal(res.data.total);
        if (res.data.total > 0 && page === 1) {
          setRecent((prev) => {
            const next = [{ q: debouncedQuery, at: Date.now() }, ...prev.filter((x) => x.q.toLowerCase() !== debouncedQuery.toLowerCase())].slice(
              0,
              MAX_RECENT
            );
            saveRecent(next);
            return next;
          });
        }
      } catch {
        if (!cancelled) {
          setSearchError("Arama yapılamadı.");
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setActiveTab("genel");
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await drugsApi.detail(selectedId);
        if (!cancelled) setDetail(res.data);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const removeRecent = useCallback((q: string) => {
    setRecent((prev) => {
      const next = prev.filter((x) => x.q !== q);
      saveRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  const applyRecent = useCallback((q: string) => {
    skipNextPageReset.current = true;
    setQuery(q);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const mobileDetailOpen = Boolean(selectedId);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/farmakoloji"
              className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
              aria-label="Farmakoloji"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-black text-lg tracking-tight truncate">İlaç Rehberi</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row min-h-0 max-w-7xl mx-auto w-full">
        {/* Sol: arama + liste */}
        <aside
          className={`flex flex-col border-b md:border-b-0 md:border-r md:w-[35%] min-h-0 md:min-h-[calc(100vh-4rem)] ${
            mobileDetailOpen ? "hidden md:flex" : "flex"
          }`}
          style={{ borderColor: "var(--border)" }}
        >
          <div className="p-4 space-y-3 shrink-0">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İlaç adı veya endikasyon ara..."
              minLength={2}
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            {recent.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
                    Son aramalar
                  </span>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-[10px] font-bold uppercase opacity-60 hover:opacity-100"
                    style={{ color: "var(--primary)" }}
                  >
                    Tümünü temizle
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <li
                      key={r.at + r.q}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold"
                      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
                    >
                      <button type="button" onClick={() => applyRecent(r.q)} className="truncate max-w-[140px]">
                        {r.q}
                      </button>
                      <button type="button" onClick={() => removeRecent(r.q)} aria-label="Kaldır">
                        <X className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
            {searchError && (
              <div className="rounded-xl border px-3 py-2 text-sm font-medium mb-3" style={{ borderColor: "var(--error, #b91c1c)", color: "var(--error, #b91c1c)" }}>
                {searchError}
              </div>
            )}
            {searchLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              </div>
            )}
            {!searchLoading && debouncedQuery.length >= 2 && results.length === 0 && !searchError && (
              <p className="text-sm font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
                Sonuç bulunamadı.
              </p>
            )}
            {!searchLoading && debouncedQuery.length < 2 && (
              <p className="text-xs font-medium text-center py-6 px-2" style={{ color: "var(--text-muted)" }}>
                Aramak için en az 2 karakter girin.
              </p>
            )}
            <ul className="space-y-2">
              {results.map((r) => {
                const sel = selectedId === r.drugbank_id;
                const badge = atcBadgeText(r.atc_codes);
                return (
                  <li key={r.drugbank_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.drugbank_id)}
                      className="w-full text-left rounded-xl border p-3 transition-colors"
                      style={{
                        borderColor: sel ? "var(--primary)" : "var(--border)",
                        background: sel ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--surface)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-black text-sm leading-snug" style={{ color: "var(--text)" }}>
                          {r.name}
                        </span>
                        {badge && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase max-w-[40%] truncate"
                            style={{
                              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                              color: "var(--accent)",
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </div>
                      {r.indication && (
                        <p className="text-xs font-medium mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {indicationPreview(r.indication)}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {debouncedQuery.length >= 2 && total > 0 && (
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  disabled={page <= 1 || searchLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 text-xs font-bold uppercase disabled:opacity-40"
                  style={{ color: "var(--primary)" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Önceki
                </button>
                <span className="text-xs font-bold tabular-nums opacity-70" style={{ color: "var(--text-muted)" }}>
                  {page} / {totalPages} · {total} kayıt
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || searchLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 text-xs font-bold uppercase disabled:opacity-40"
                  style={{ color: "var(--primary)" }}
                >
                  Sonraki
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Sağ: detay */}
        <section
          className={`flex-1 flex flex-col min-h-[50vh] md:min-h-[calc(100vh-4rem)] ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedId && (
            <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  router.replace("/farmakoloji/ilaclar", { scroll: false });
                }}
                className="p-2 rounded-xl hover:bg-black/5"
                style={{ color: "var(--text-muted)" }}
                aria-label="Listeye dön"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-black truncate">Detay</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {!selectedId && (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-3 text-center px-4">
                <Pill className="w-16 h-16 opacity-25" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                  Bir ilaç seçin
                </p>
              </div>
            )}

            {selectedId && detailLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              </div>
            )}

            {selectedId && !detailLoading && detail && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
                  {(["genel", "pk", "etkilesim"] as TabId[]).map((tid) => (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => setActiveTab(tid)}
                      className="px-3 py-2 text-sm font-black uppercase tracking-wide border-b-2 -mb-px transition-colors"
                      style={{
                        borderColor: activeTab === tid ? "var(--primary)" : "transparent",
                        color: activeTab === tid ? "var(--text)" : "var(--text-muted)",
                      }}
                    >
                      {tid === "genel" ? "Genel Bakış" : tid === "pk" ? "Farmakokinetik" : "Etkileşimler"}
                    </button>
                  ))}
                </div>

                {activeTab === "genel" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                        {detail.name}
                      </h2>
                      {detail.groups && (
                        <span
                          className="inline-block mt-2 rounded-full px-2.5 py-0.5 text-xs font-black"
                          style={{
                            background: detail.groups.toLowerCase().includes("approved")
                              ? "color-mix(in srgb, #16a34a 18%, transparent)"
                              : "color-mix(in srgb, var(--warning) 18%, transparent)",
                            color: detail.groups.toLowerCase().includes("approved") ? "#15803d" : "var(--warning)",
                          }}
                        >
                          {detail.groups}
                        </span>
                      )}
                      {detail.atc_codes && (
                        <p className="text-xs font-medium mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {detail.atc_codes}
                        </p>
                      )}
                    </div>

                    {[
                      ["Endikasyon", detail.indication],
                      ["Mekanizma", detail.mechanism],
                      ["Farmakodinami", detail.pharmacodynamics],
                      ["Toksisite", detail.toxicity],
                    ].map(([title, val]) =>
                      val?.trim() ? (
                        <div
                          key={title as string}
                          className="rounded-2xl border p-4"
                          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                        >
                          <h3 className="text-xs font-black uppercase tracking-widest mb-2 opacity-60" style={{ color: "var(--text-muted)" }}>
                            {title}
                          </h3>
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                            {val}
                          </p>
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {activeTab === "pk" && (
                  <PkTable detail={detail} />
                )}

                {activeTab === "etkilesim" && (
                  <DrugInteractionsTab detail={detail} onPickDrug={(id) => setSelectedId(id)} />
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function IlaclarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
        </div>
      }
    >
      <IlaclarPageContent />
    </Suspense>
  );
}

function PkTable({ detail }: { detail: DrugDetail }) {
  const rows = (
    [
      ["Yarı ömür", detail.half_life],
      ["Protein bağlanması", detail.protein_binding],
      ["Metabolizma", detail.metabolism],
      ["Emilim", detail.absorption],
      ["Dağılım hacmi", detail.volume_of_distribution],
      ["Eliminasyon yolu", detail.route_of_elimination],
      ["Ortalama kütle", detail.average_mass],
    ] as const
  ).filter(([, v]) => v?.trim());

  if (rows.length === 0) {
    return (
      <p className="text-sm font-medium py-8 text-center" style={{ color: "var(--text-muted)" }}>
        Farmakokinetik verisi yok.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, val]) => (
            <tr key={label} className="border-t first:border-t-0" style={{ borderColor: "var(--border)" }}>
              <td className="w-[40%] px-4 py-3 font-bold text-xs uppercase tracking-wide opacity-70" style={{ color: "var(--text-muted)" }}>
                {label}
              </td>
              <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                {val}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrugInteractionsTab({
  detail,
  onPickDrug,
}: {
  detail: DrugDetail;
  onPickDrug: (id: string) => void;
}) {
  const ids = parseDrugbankIds(detail.drug_interactions);
  const shown = ids.slice(0, 20);
  const rest = ids.length - shown.length;
  const food = detail.food_interactions?.trim();
  const emptyInteractions = ids.length === 0 && !food;

  return (
    <div className="space-y-6">
      {emptyInteractions && (
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Etkileşim verisi bulunamadı.
        </p>
      )}

      {ids.length > 0 && (
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 opacity-60" style={{ color: "var(--text-muted)" }}>
            İlaç etkileşimleri
          </h3>
          <div className="flex flex-wrap gap-2">
            {shown.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onPickDrug(id)}
                className="rounded-full px-2.5 py-1 text-xs font-black border transition-colors hover:opacity-90"
                style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
              >
                {id}
              </button>
            ))}
            {rest > 0 && (
              <span className="text-xs font-bold self-center opacity-60" style={{ color: "var(--text-muted)" }}>
                + {rest} daha
              </span>
            )}
          </div>
        </div>
      )}

      {food && (
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 opacity-60" style={{ color: "var(--text-muted)" }}>
            Gıda etkileşimleri
          </h3>
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {food}
          </p>
        </div>
      )}
    </div>
  );
}
