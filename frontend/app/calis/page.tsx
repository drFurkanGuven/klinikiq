"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Flame,
  Clock,
  Play,
  Loader2,
  AlertCircle,
  Zap,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { StudyNav } from "@/components/study/StudyNav";
import { CalisIlerlemeTab } from "@/components/calis/CalisIlerlemeTab";
import { CalisOgrenTab } from "@/components/calis/CalisOgrenTab";
import { CalisProfilTab } from "@/components/calis/CalisProfilTab";
import { studyApi, type StudyDashboard } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import Footer from "@/components/Footer";
import { nativeClient } from "@/lib/native";

const GOALS = [5, 10, 20] as const;
const TABS = [
  { id: "bugun", label: "Bugün" },
  { id: "ilerleme", label: "İlerleme" },
  { id: "ogren", label: "Öğren" },
  { id: "profil", label: "Profil" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function CalisPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId =
    tabParam === "ilerleme" || tabParam === "ogren" || tabParam === "profil" ? tabParam : "bugun";

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<StudyDashboard | null>(null);
  const [goal, setGoal] = useState<5 | 10 | 20>(10);
  const [error, setError] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace("/login?next=/calis");
      return;
    }
    if (activeTab !== "bugun") {
      setLoading(false);
      return;
    }
    Promise.all([studyApi.dashboard()])
      .then(([d]) => {
        setDash(d.data);
        setGoal((d.data.daily_goal as 5 | 10 | 20) || 10);
      })
      .catch(() => setError("Çalışma verileri yüklenemedi."))
      .finally(() => setLoading(false));
  }, [router, activeTab]);

  const setTab = (tab: TabId) => {
    nativeClient.impact();
    const qs = tab === "bugun" ? "" : `?tab=${tab}`;
    router.push(`/calis${qs}`);
  };

  const saveGoal = async (g: 5 | 10 | 20) => {
    setGoal(g);
    setSavingGoal(true);
    try {
      await studyApi.patchSettings(g);
      nativeClient.impact();
    } catch {
      /* ignore */
    } finally {
      setSavingGoal(false);
    }
  };

  const startDaily = () => {
    nativeClient.impact();
    router.push(`/calis/oturum?goal=${goal}`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <StudyNav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Çalış</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {activeTab === "bugun" && "Türkçe acil MCQ + akıllı tekrar"}
            {activeTab === "ilerleme" && "Tüm ders ve modül ilerlemelerin"}
            {activeTab === "ogren" && "Histoloji, farmako, atlas ve daha fazlası"}
            {activeTab === "profil" && "Hesap bilgileri ve uygulama ayarları"}
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-lg border w-full overflow-x-auto" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex-1 min-w-[4.5rem] py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                background: activeTab === id ? "var(--accent)" : "transparent",
                color: activeTab === id ? "var(--accent-foreground)" : "var(--text-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "ilerleme" && <CalisIlerlemeTab />}
        {activeTab === "ogren" && <CalisOgrenTab />}
        {activeTab === "profil" && <CalisProfilTab />}

        {activeTab === "bugun" && loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--foreground)" }} />
          </div>
        )}

        {activeTab === "bugun" && error && (
          <div className="flex items-center gap-2 text-sm p-4 rounded-lg border" style={{ borderColor: "var(--destructive)", color: "var(--destructive)", background: "var(--destructive-muted)" }}>
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {activeTab === "bugun" && dash && !loading && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <Flame className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--foreground)" }} />
                <p className="text-2xl font-semibold tabular-nums">{dash.current_streak}</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--muted)" }}>Gün serisi</p>
              </div>
              <div className="rounded-lg border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <Clock className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--foreground)" }} />
                <p className="text-2xl font-semibold tabular-nums">{dash.due_count}</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--muted)" }}>Tekrar due</p>
              </div>
              <div className="rounded-lg border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <p className="text-2xl font-semibold tabular-nums">
                  {dash.answered_today}/{dash.daily_goal}
                </p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--muted)" }}>Bugün</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>Günlük hedef</p>
              <div className="flex gap-1 p-1 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    disabled={savingGoal}
                    onClick={() => saveGoal(g)}
                    className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors"
                    style={{
                      background: goal === g ? "var(--accent)" : "transparent",
                      color: goal === g ? "var(--accent-foreground)" : "var(--text-muted)",
                    }}
                  >
                    {g} soru
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={startDaily} className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base rounded-lg">
              <Play className="w-5 h-5" />
              Oturumu başlat
            </button>

            <div className="space-y-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>İkincil modlar</p>
              <Link
                href="/calis/oturum?mode=acil"
                onClick={() => nativeClient.impact()}
                className="card-hover flex items-center justify-between p-4 rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="flex items-center gap-3 font-medium text-sm">
                  <Zap className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                  Acil simülasyon (zamanlayıcı + AI)
                </span>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </Link>
              <Link
                href="/calis/oturum?mode=usmle"
                onClick={() => nativeClient.impact()}
                className="card-hover flex items-center justify-between p-4 rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="flex items-center gap-3 font-medium text-sm">
                  <GraduationCap className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                  USMLE havuzu (İngilizce)
                </span>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </Link>
            </div>

            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              Havuz: {dash.pool_mcq_count.toLocaleString("tr-TR")} TR acil sorusu
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function CalisPage() {
  return (
    <Suspense fallback={null}>
      <CalisPageContent />
    </Suspense>
  );
}
