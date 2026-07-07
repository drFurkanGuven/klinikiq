"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  BarChart3,
  Loader2,
  Flame,
  Clock,
  Target,
  Pill,
  PenLine,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  studyApi,
  usersApi,
  questionsApi,
  pharmaApi,
  type HistoryItem,
  type StudyDashboard,
  type StudyTopicMastery,
  type QuestionStats,
  type PharmaMapSummary,
} from "@/lib/api";
import { TopicRing } from "@/components/study/TopicRing";
import { getMapProgress, getOverallProgress, ensurePharmaProgressHydrated } from "@/lib/pharmaProgress";
import { nativeClient } from "@/lib/native";

function computeCaseStats(history: HistoryItem[]) {
  const completedHistory = history.filter((h) => h.status === "completed" && h.score != null);
  const bestScoresByCase = new Map<string, number>();

  completedHistory.forEach((h) => {
    const currentHighest = bestScoresByCase.get(h.case_title) || 0;
    if (h.score! > currentHighest) {
      bestScoresByCase.set(h.case_title, h.score!);
    }
  });

  const uniqueCompletedCount = bestScoresByCase.size;
  const uniqueTotalCount = new Set(history.map((h) => h.case_title)).size;
  const avgScore =
    uniqueCompletedCount > 0
      ? Math.round(
          Array.from(bestScoresByCase.values()).reduce((sum, score) => sum + score, 0) /
            uniqueCompletedCount
        )
      : null;

  const activeCount = history.filter((h) => h.status === "active" || h.status === "abandoned").length;

  return { uniqueCompletedCount, uniqueTotalCount, avgScore, activeCount };
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CalisIlerlemeTab() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<StudyDashboard | null>(null);
  const [topics, setTopics] = useState<StudyTopicMastery[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [qStats, setQStats] = useState<QuestionStats | null>(null);
  const [pharmaMaps, setPharmaMaps] = useState<PharmaMapSummary[]>([]);
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    ensurePharmaProgressHydrated().then(() =>
    Promise.all([
      studyApi.dashboard(),
      studyApi.topics(),
      usersApi.history(),
      questionsApi.stats().catch(() => null),
      pharmaApi.listMaps().catch(() => ({ data: [] as PharmaMapSummary[] })),
      usersApi.getStudyNotes().catch(() => ({ data: [] })),
    ])
      .then(([d, t, h, qs, maps, notes]) => {
        setDash(d.data);
        setTopics(t.data.filter((x) => x.seen > 0).sort((a, b) => b.mastery_pct - a.mastery_pct));
        setHistory(h.data);
        setQStats(qs?.data ?? null);
        setPharmaMaps(maps.data);
        setNotesCount(notes.data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    );
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--foreground)" }} />
      </div>
    );
  }

  const caseStats = computeCaseStats(history);
  const pharmaOverall = getOverallProgress(pharmaMaps.map((m) => m.id));
  const startedTopics = topics.filter((t) => t.seen > 0);

  return (
    <div className="space-y-8">
      {dash && (
        <Section title="Günlük MCQ çalışması">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard icon={Flame} value={dash.current_streak} label="Gün serisi" />
            <StatCard icon={Target} value={dash.longest_streak} label="En uzun seri" />
            <StatCard icon={Clock} value={dash.due_count} label="Tekrar due" />
            <StatCard
              icon={BarChart3}
              value={`${dash.answered_today}/${dash.daily_goal}`}
              label="Bugün"
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Havuz: {dash.pool_mcq_count.toLocaleString("tr-TR")} TR acil sorusu
          </p>
        </Section>
      )}

      {startedTopics.length > 0 && (
        <Section title="Konu ustalığı (MCQ)">
          <div className="flex flex-wrap gap-4">
            {startedTopics.map((t) => (
              <TopicRing
                key={t.topic_slug}
                label={t.topic_label}
                masteryPct={t.mastery_pct}
                seen={t.seen}
              />
            ))}
          </div>
        </Section>
      )}

      {dash && dash.weak_topics.length > 0 && (
        <Section title="Zayıf konular">
          <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {dash.weak_topics.map((w) => (
              <div key={w.topic_slug} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{w.topic_label}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--destructive)" }}>
                  {w.wrong_count}/{w.total_count} yanlış
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Vaka simülasyonu"
        action={
          <Link
            href="/vaka"
            onClick={() => nativeClient.impact()}
            className="text-xs font-medium flex items-center gap-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            Vakaya git <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard icon={BookOpen} value={caseStats.uniqueTotalCount} label="Farklı vaka" />
          <StatCard icon={Trophy} value={caseStats.avgScore ?? "—"} label="Ort. skor" />
          <StatCard icon={CheckCircle2} value={caseStats.uniqueCompletedCount} label="Tamamlanan" />
          <StatCard icon={AlertTriangle} value={caseStats.activeCount} label="Yarım kalan" />
        </div>
      </Section>

      {qStats && qStats.attempted > 0 && (
        <Section title="Klasik soru bankası">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard icon={BookOpen} value={qStats.attempted} label="Çözülen" />
            <StatCard icon={CheckCircle2} value={qStats.correct} label="Doğru" />
            <StatCard icon={AlertTriangle} value={qStats.incorrect} label="Yanlış" />
            <StatCard icon={Trophy} value={`%${Math.round(qStats.correct_rate)}`} label="Başarı" />
          </div>
        </Section>
      )}

      {pharmaMaps.length > 0 && (
        <Section
          title="Farmakoloji haritaları"
          action={
            <Link
              href="/farmakoloji/haritalar"
              onClick={() => nativeClient.impact()}
              className="text-xs font-medium flex items-center gap-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Haritalar <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Genel ilerleme</span>
              <span className="tabular-nums font-semibold">
                {pharmaOverall.completed}/{pharmaOverall.total} (%{pharmaOverall.pct})
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pharmaOverall.pct}%`, background: "var(--accent)" }}
              />
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {pharmaMaps
                .sort((a, b) => a.order - b.order)
                .map((m) => {
                  const p = getMapProgress(m.id);
                  return (
                    <Link
                      key={m.id}
                      href={`/farmakoloji/haritalar/${m.id}`}
                      onClick={() => nativeClient.impact()}
                      className="flex items-center justify-between gap-2 py-1.5 text-xs rounded-md px-2 -mx-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Pill className="w-3 h-3 shrink-0 opacity-50" />
                        <span className="truncate">{m.title_tr}</span>
                      </span>
                      <span className="shrink-0 tabular-nums" style={{ color: p.quizCompleted ? "var(--success)" : "var(--text-muted)" }}>
                        {p.quizCompleted ? `✓ %${p.quizScorePct}` : p.pathTreeCompleted ? "Yolak ✓" : p.visited ? "Başlandı" : "—"}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Kişisel özetler"
        action={
          <Link
            href="/study-notes"
            onClick={() => nativeClient.impact()}
            className="text-xs font-medium flex items-center gap-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            Özetler <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        <div className="rounded-lg border p-4 flex items-center gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <PenLine className="w-4 h-4" style={{ color: "var(--foreground)" }} />
          <div>
            <p className="text-lg font-semibold tabular-nums">{notesCount}</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Kayıtlı özet</p>
          </div>
        </div>
      </Section>

      {!dash && startedTopics.length === 0 && history.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
          Henüz ilerleme verisi yok. Bugün sekmesinden çalışmaya başlayabilirsin.
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <Icon className="w-4 h-4 mb-2" style={{ color: "var(--foreground)" }} />
      <p className="text-lg sm:text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>{label}</p>
    </div>
  );
}
