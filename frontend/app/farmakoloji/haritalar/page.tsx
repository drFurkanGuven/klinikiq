"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import { pharmaApi, type PharmaMapSummary } from "@/lib/api";
import {
  getMapProgress,
  getOverallProgress,
  prerequisitesMet,
  isMapCompleted,
  ensurePharmaProgressHydrated,
} from "@/lib/pharmaProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  LogOut,
  Waypoints,
  ChevronRight,
  Loader2,
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  Star,
  BookOpen,
} from "lucide-react";

const LEVEL_LABEL: Record<string, string> = {
  temel: "Temel",
  sistem: "Sistem",
  klinik: "Klinik",
};

export default function PharmaMapsListPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [maps, setMaps] = useState<PharmaMapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pathDescription, setPathDescription] = useState("");
  const [, tick] = useState(0);
  const refreshProgress = useCallback(() => tick((n) => n + 1), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/haritalar");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await ensurePharmaProgressHydrated();
        const [mapsRes, pathRes] = await Promise.all([
          pharmaApi.listMaps(),
          pharmaApi.getLearningPath(),
        ]);
        setMaps(mapsRes.data);
        setPathDescription(pathRes.data.description_tr);
      } catch {
        setError("Haritalar yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;
    const onStorage = () => refreshProgress();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted, refreshProgress]);

  if (!mounted) return null;

  const mapIds = maps.map((m) => m.id);
  const overall = getOverallProgress(mapIds);

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/calis"
              className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
              aria-label="Ana sayfa"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
                <Waypoints className="w-5 h-5" style={{ color: "var(--accent-foreground)" }} />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-lg tracking-tight block leading-tight truncate">Mantık Haritaları</span>
                <span className="text-[10px] font-medium uppercase tracking-widest opacity-50">Farmakoloji · Öğrenme yolu</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button type="button" onClick={logout} className="flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-black/5" style={{ color: "var(--text-muted)" }}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Farmakoloji öğrenme yolu</h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {pathDescription ||
              "İlaçların mantığını reseptör → organ → etki zinciriyle öğrenin. Her modülü sırayla tamamlayın."}
          </p>

          {!loading && maps.length > 0 && (
            <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Genel ilerleme
                </span>
                <span style={{ color: "var(--muted)" }}>
                  {overall.completed} / {overall.total} harita
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${overall.pct}%`, background: "var(--accent)" }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                Bir harita, quizde %70 ve üzeri skorla tamamlanır.
              </p>
            </div>
          )}

          <div
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Curated statik içerik — çalışma anında üretilmez.
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--foreground)" }} />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border px-5 py-4 text-sm" style={{ borderColor: "var(--destructive)", color: "var(--destructive)", background: "var(--destructive-muted)" }}>
            {error}
          </div>
        )}

        {!loading && !error && maps.length > 0 && (
          <ol className="space-y-3">
            {maps.map((m) => {
              const progress = getMapProgress(m.id);
              const completed = isMapCompleted(m.id);
              const unlocked = prerequisitesMet(m.prerequisites);
              const levelLabel = LEVEL_LABEL[m.level] ?? m.level;

              return (
                <li key={m.id}>
                  {unlocked ? (
                    <Link
                      href={`/farmakoloji/haritalar/${m.id}`}
                      className="flex gap-4 rounded-xl border p-4 sm:p-5 transition-all hover:border-[var(--border-strong)] group"
                      style={{ background: "var(--surface)", borderColor: completed ? "var(--foreground)" : "var(--border)" }}
                    >
                      <MapCardInner m={m} order={m.order} levelLabel={levelLabel} completed={completed} progress={progress} unlocked />
                      <ChevronRight className="w-5 h-5 shrink-0 self-center opacity-40 group-hover:opacity-100" />
                    </Link>
                  ) : (
                    <div
                      className="flex gap-4 rounded-xl border p-4 sm:p-5 opacity-60"
                      style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
                      title="Önce ön koşul haritalarını tamamlayın"
                    >
                      <MapCardInner m={m} order={m.order} levelLabel={levelLabel} completed={false} progress={progress} unlocked={false} />
                      <Lock className="w-5 h-5 shrink-0 self-center" style={{ color: "var(--muted)" }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </main>

      <Footer />
    </div>
  );
}

function MapCardInner({
  m,
  order,
  levelLabel,
  completed,
  progress,
  unlocked,
}: {
  m: PharmaMapSummary;
  order: number;
  levelLabel: string;
  completed: boolean;
  progress: ReturnType<typeof getMapProgress>;
  unlocked: boolean;
}) {
  return (
    <>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold border"
        style={{
          borderColor: completed ? "var(--foreground)" : "var(--border)",
          background: completed ? "var(--accent)" : "var(--surface-muted)",
          color: completed ? "var(--accent-foreground)" : "var(--foreground)",
        }}
      >
        {completed ? <CheckCircle2 className="w-5 h-5" /> : order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="font-semibold text-base leading-snug">{m.title_tr}</h3>
          <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            {levelLabel}
          </span>
          {!unlocked && m.prerequisites.length > 0 && (
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
              Ön koşul: {m.prerequisites.join(", ")}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed line-clamp-2 mb-2" style={{ color: "var(--text-muted)" }}>
          {m.description_tr}
        </p>
        <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted)" }}>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> ~{m.estimated_minutes} dk
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> {m.high_yield_count} high-yield
          </span>
          <span>{m.quiz_count} quiz</span>
          {progress.pathTreeCompleted && <span>Yolak ✓</span>}
          {progress.quizScorePct != null && (
            <span>Quiz: %{progress.quizScorePct}</span>
          )}
        </div>
      </div>
    </>
  );
}
