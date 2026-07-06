"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { drugsApi, type DrugSummary } from "@/lib/api";
import { ArrowLeft, ChevronDown, Layers, Loader2, LogOut } from "lucide-react";

function firstWordKey(s: string): string {
  const w = s.trim().split(/\s+/)[0] || "";
  return w.toUpperCase();
}

function mainGroupTitle(key: string): string {
  if (!key) return "";
  return key
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function indicationPreview(s: string | null, max = 80): string {
  if (!s?.trim()) return "";
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export default function SiniflarPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [drugs, setDrugs] = useState<DrugSummary[]>([]);
  const [drugsLoading, setDrugsLoading] = useState(false);
  const [drugsError, setDrugsError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of categories) {
      const k = firstWordKey(c);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.localeCompare(b, "tr"));
    }
    return m;
  }, [categories]);

  const mainKeys = useMemo(() => Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, "tr")), [grouped]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/siniflar");
    }
  }, [mounted, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTreeLoading(true);
      setTreeError(null);
      try {
        const res = await drugsApi.atcTree();
        if (!cancelled) setCategories(res.data.categories ?? []);
      } catch {
        if (!cancelled) {
          setTreeError("ATC listesi yüklenemedi.");
          setCategories([]);
        }
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setDrugs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDrugsLoading(true);
      setDrugsError(null);
      try {
        const res = await drugsApi.byAtc(selectedCategory);
        if (!cancelled) setDrugs(res.data.results ?? []);
      } catch {
        if (!cancelled) {
          setDrugsError("İlaçlar yüklenemedi.");
          setDrugs([]);
        }
      } finally {
        if (!cancelled) setDrugsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/farmakoloji" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }} aria-label="Farmakoloji">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-black text-lg tracking-tight truncate">ATC Sınıflandırması</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button type="button" onClick={logout} className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5" style={{ color: "var(--text-muted)" }}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full min-h-0">
        <aside className="w-full md:w-[30%] border-b md:border-b-0 md:border-r flex flex-col min-h-[40vh] md:min-h-[calc(100vh-4rem)]" style={{ borderColor: "var(--border)" }}>
          <div className="p-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
              Kategoriler
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {treeLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              </div>
            )}
            {treeError && (
              <div className="rounded-xl border px-3 py-2 text-sm font-medium m-2" style={{ borderColor: "var(--error, #b91c1c)", color: "var(--error, #b91c1c)" }}>
                {treeError}
              </div>
            )}
            {!treeLoading && !treeError && mainKeys.length === 0 && (
              <p className="text-sm font-medium px-3 py-6 text-center" style={{ color: "var(--text-muted)" }}>
                ATC kategorisi bulunamadı.
              </p>
            )}
            <ul className="space-y-1">
              {mainKeys.map((key) => {
                const subs = grouped.get(key) ?? [];
                const open = expanded[key] ?? false;
                return (
                  <li key={key} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(key)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-black"
                      style={{ color: "var(--text)" }}
                    >
                      <span className="truncate">{mainGroupTitle(key)}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
                    </button>
                    {open && (
                      <ul className="border-t px-1 py-1 space-y-0.5" style={{ borderColor: "var(--border)" }}>
                        {subs.map((sub) => {
                          const sel = selectedCategory === sub;
                          return (
                            <li key={sub}>
                              <button
                                type="button"
                                onClick={() => setSelectedCategory(sub)}
                                className="w-full text-left px-2 py-2 rounded-lg text-xs font-medium leading-snug"
                                style={{
                                  background: sel ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                                  color: sel ? "var(--primary)" : "var(--text-muted)",
                                }}
                              >
                                {sub}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-h-[50vh] md:min-h-[calc(100vh-4rem)]">
          {!selectedCategory && !drugsLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-16">
              <Layers className="w-16 h-16 opacity-25" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                Bir kategori seçin
              </p>
            </div>
          )}

          {selectedCategory && drugsLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          )}

          {selectedCategory && drugsError && (
            <div className="p-4">
              <div className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--error, #b91c1c)", color: "var(--error, #b91c1c)" }}>
                {drugsError}
              </div>
            </div>
          )}

          {selectedCategory && !drugsLoading && !drugsError && drugs.length === 0 && (
            <p className="text-sm font-medium text-center py-16 px-4" style={{ color: "var(--text-muted)" }}>
              Bu kategoride kayıt bulunamadı.
            </p>
          )}

          {selectedCategory && !drugsLoading && !drugsError && drugs.length > 0 && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <ul className="space-y-2 max-w-3xl mx-auto">
                {drugs.map((item) => (
                  <li key={item.drugbank_id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/farmakoloji/ilaclar?drug=${encodeURIComponent(item.drugbank_id)}`)}
                      className="w-full text-left rounded-2xl border p-4 transition-colors hover:shadow-md"
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-black text-sm" style={{ color: "var(--text)" }}>
                          {item.name}
                        </span>
                        {item.groups && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black"
                            style={{
                              background: item.groups.toLowerCase().includes("approved")
                                ? "color-mix(in srgb, #16a34a 18%, transparent)"
                                : "color-mix(in srgb, var(--text-muted) 15%, transparent)",
                              color: item.groups.toLowerCase().includes("approved") ? "#15803d" : "var(--text-muted)",
                            }}
                          >
                            {item.groups}
                          </span>
                        )}
                      </div>
                      {item.indication && (
                        <p className="text-xs font-medium mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {indicationPreview(item.indication)}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
