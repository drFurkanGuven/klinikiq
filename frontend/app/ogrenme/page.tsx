"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import LearningCard from "@/components/LearningCard";
import { learningApi, type LearningCard as LearningCardT } from "@/lib/api";
import { storage } from "@/lib/storage";
import { ArrowLeft, BookOpen, Loader2, LogOut, PenLine, Sparkles } from "lucide-react";

const PAGE_SIZE = 12;

const SPEC_LABEL: Record<string, string> = {
  cardiology: "Kardiyoloji",
  neurology: "Nöroloji",
  nephrology: "Nefroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  hematology: "Hematoloji",
  infectious_disease: "Enfeksiyon",
  rheumatology: "Romatoloji",
  endocrinology: "Endokrinoloji",
  dermatology: "Dermatoloji",
  other: "Diğer",
};

function specialtyOptionLabel(s: string) {
  return SPEC_LABEL[s] || s;
}

export default function OgrenmePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<LearningCardT[]>([]);
  const [total, setTotal] = useState(0);
  const [specialty, setSpecialty] = useState<string>("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    storage.waitForInit().then(() => {
      if (!isAuthenticated()) {
        router.replace("/login?next=/ogrenme");
        return;
      }
      setAuthReady(true);
    });
  }, [mounted, router]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await learningApi.specialties();
        if (!cancelled) setSpecialties(res.data);
      } catch {
        if (!cancelled) setSpecialties([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await learningApi.cards({
          specialty: specialty || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setItems(res.data.items);
          setTotal(res.data.total);
        }
      } catch {
        if (!cancelled) {
          setError("Liste yüklenemedi.");
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, specialty]);

  async function loadMore() {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await learningApi.cards({
        specialty: specialty || undefined,
        limit: PAGE_SIZE,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...res.data.items]);
      setTotal(res.data.total);
    } catch {
      setError("Devamı yüklenemedi.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans pt-[env(safe-area-inset-top,0px)]"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-6 min-h-[3.5rem] sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Link
              href="/dashboard"
              className="p-3 sm:p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ color: "var(--text-muted)" }}
              aria-label="Panele dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{ background: "var(--primary)" }}>
                <BookOpen className="w-[1.125rem] h-[1.125rem] sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-base sm:text-lg tracking-tight block leading-tight truncate">Vaka özetleri</span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-40">Havuz · TUS</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              href="/study-notes"
              className="flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2.5 text-xs font-bold uppercase tracking-wide opacity-90 hover:opacity-100 touch-manipulation min-h-[44px] min-w-[44px] sm:min-w-0"
              style={{ color: "var(--text-muted)" }}
              aria-label="Kişisel özetler"
              title="Kişisel özetler"
            >
              <PenLine className="w-[1.125rem] h-[1.125rem] sm:w-4 sm:h-4 shrink-0" style={{ color: "var(--primary)" }} />
              <span className="hidden sm:inline">Kişisel</span>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center justify-center gap-2 text-sm font-bold px-2.5 sm:px-3 py-2.5 rounded-xl hover:bg-black/5 touch-manipulation min-h-[44px] min-w-[44px] sm:min-w-0"
              style={{ color: "var(--text-muted)" }}
              aria-label="Çıkış yap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="text-center space-y-3 mb-8 sm:mb-10 max-w-2xl mx-auto px-1">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--primary)" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Topluluk havuzu
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: "var(--text)" }}>
            Tamamlanan vakalardan özetler
          </h1>
          <p className="text-sm font-medium leading-relaxed opacity-70 text-balance" style={{ color: "var(--text-muted)" }}>
            Patofizyoloji ve TUS notları, raporlardan otomatik üretilir; vaka başına güncel özet gösterilir. Kendi çözdüğün vakalar için{" "}
            <Link href="/study-notes" className="underline font-bold" style={{ color: "var(--primary)" }}>
              kişisel özetler
            </Link>
            .
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-baseline justify-between gap-2 mb-2 px-0.5">
            <span className="text-xs font-black uppercase tracking-wide opacity-60" style={{ color: "var(--text-muted)" }}>
              Branş
            </span>
            <span className="text-xs font-medium tabular-nums opacity-50 shrink-0" style={{ color: "var(--text-muted)" }}>
              {total} kayıt
            </span>
          </div>
          {/* Mobilde yatay kaydırma + büyük dokunma alanı; masaüstünde de aynı hızlı seçim */}
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Branş filtresi"
          >
            <button
              type="button"
              role="tab"
              aria-selected={specialty === ""}
              onClick={() => setSpecialty("")}
              className="snap-start shrink-0 rounded-full px-4 py-3 text-sm font-bold touch-manipulation transition-colors min-h-[48px] sm:min-h-0 sm:py-2.5"
              style={
                specialty === ""
                  ? { background: "var(--primary)", color: "white", boxShadow: "0 1px 0 color-mix(in srgb, black 12%, transparent)" }
                  : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }
              }
            >
              Tümü
            </button>
            {specialties.map((s) => {
              const active = specialty === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSpecialty(s)}
                  className="snap-start shrink-0 rounded-full px-4 py-3 text-sm font-bold touch-manipulation transition-colors max-w-[min(100vw-4rem,16rem)] truncate min-h-[48px] sm:min-h-0 sm:py-2.5"
                  style={
                    active
                      ? { background: "var(--primary)", color: "white", boxShadow: "0 1px 0 color-mix(in srgb, black 12%, transparent)" }
                      : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }
                  }
                  title={specialtyOptionLabel(s)}
                >
                  {specialtyOptionLabel(s)}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium mb-6 px-1" style={{ color: "var(--error, #b91c1c)" }}>
            {error}
          </p>
        )}

        {!authReady || loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <p className="font-bold">Henüz gösterilecek özet yok.</p>
            <p className="text-sm mt-2 opacity-80">Tamamlanan vaka raporlarında patofizyoloji veya TUS alanı dolu olanlar burada listelenir.</p>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-8">
            {items.map((c) => (
              <LearningCard key={`${c.report_id}-${c.case_id}`} card={c} />
            ))}
            {items.length < total && (
              <div className="flex justify-center pt-2 sm:pt-4 px-1">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="w-full sm:w-auto min-h-[52px] sm:min-h-0 px-6 py-3.5 sm:py-3 rounded-2xl sm:rounded-xl text-sm font-black uppercase tracking-wide border disabled:opacity-50 touch-manipulation active:scale-[0.99] transition-transform"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  {loadingMore ? <Loader2 className="w-5 h-5 animate-spin inline" /> : "Daha fazla"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
