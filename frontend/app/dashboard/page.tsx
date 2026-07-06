"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { casesApi, usersApi, authApi, sessionsApi, questionsApi, type HistoryItem, type UserOut, type QuestionStats } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import {
  Stethoscope, LogOut, BookOpen, Trophy, BarChart3, Clock, Bot, ShieldAlert, Dna, Play, CheckCircle2, AlertCircle, Sparkles, GraduationCap, Microscope, Brain, Settings, X, Check, Fingerprint, Sun, Moon, User, Edit2, Save, Loader2, KeyRound, RefreshCw, Filter, PenLine, ChevronDown, Pill, Zap
} from "lucide-react";

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gün önce`;
  return `${Math.floor(d / 30)} ay önce`;
}
import { nativeClient } from "@/lib/native";
import { biometricsClient } from "@/lib/biometrics";
import { storage } from "@/lib/storage";
import { useTheme } from "@/components/ThemeProvider";
import PremiumAlert from "@/components/PremiumAlert";

const SPECIALTIES = [
  { value: "cardiology", label: "Kardiyoloji" },
  { value: "endocrinology", label: "Endokrinoloji" },
  { value: "neurology", label: "Nöroloji" },
  { value: "pulmonology", label: "Pulmonoloji" },
  { value: "gastroenterology", label: "Gastroenteroloji" },
  { value: "nephrology", label: "Nefroloji" },
  { value: "infectious_disease", label: "Enfeksiyon" },
  { value: "hematology", label: "Hematoloji" },
  { value: "rheumatology", label: "Romatoloji" },
];

const DIFFICULTIES = [
  { value: "", label: "Tüm Zorluklar" },
  { value: "easy", label: "Kolay" },
  { value: "medium", label: "Orta" },
  { value: "hard", label: "Zor" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserOut | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"randomizer" | "history">("randomizer");
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null);
  const [mounted, setMounted] = useState(false);
  const [restartingSessionId, setRestartingSessionId] = useState<string | null>(null);
  const [filterSuggestion, setFilterSuggestion] = useState<{ label: string; specs: string[]; difficulty: string } | null>(null);

  // Premium Features States
  const [showSettings, setShowSettings] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled ] = useState(false);
  const [showBioInfo, setShowBioInfo] = useState(false);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileSchool, setProfileSchool] = useState("");
  const [profileYear, setProfileYear] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<"ok" | "err" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<"ok" | string | null>(null);

  /** Navbar: sınıflı menü (mobilde taşmayı önlemek için) */
  const [openNavMenu, setOpenNavMenu] = useState<null | "study" | "account">(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!openNavMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenNavMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNavMenu]);

  useEffect(() => {
    if (!mounted) return;
    // Storage init tamamlanana kadar bekle — native'de token cache hazır olmadan
    // isAuthenticated() false dönebilir ve yanlışlıkla login'e redirect olunur
    storage.waitForInit().then(() => {
      if (!isAuthenticated()) {
        router.replace("/login");
        return;
      }
      fetchData();
    });
  }, [mounted]);

  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([fetchHistory(), fetchMe(), fetchQuestionStats(), checkBiometrics()]);
    } finally {
      setLoading(false);
    }
  }

  async function checkBiometrics() {
    const available = await biometricsClient.checkAvailability();
    setBiometricsAvailable(available);
    setIsBiometricsEnabled(biometricsClient.isEnabled());
  }

  async function toggleBiometrics() {
    nativeClient.impact();
    if (isBiometricsEnabled) {
        await biometricsClient.disable();
        setIsBiometricsEnabled(false);
    } else {
        setShowBioInfo(true);
        setIsBiometricsEnabled(true);
    }
  }

  async function fetchQuestionStats() {
    try {
      const res = await questionsApi.stats();
      setQuestionStats(res.data);
    } catch {}
  }

  const handleRecommendedCase = async () => {
    nativeClient.impact();
    setIsRecommending(true);
    setErrorMsg("");
    try {
      const caseRes = await casesApi.getRecommended();
      const sessionRes = await sessionsApi.create(caseRes.data.id);
      router.push(`/case?id=${sessionRes.data.id}`);
    } catch (err: any) {
      setIsRecommending(false);
      if (err.response?.status === 404) setErrorMsg("Önerilebilecek yeni vaka kalmadı, tebrikler!");
      else if (err.response?.status === 403) setErrorMsg(err.response.data.detail || "Günlük limitinize ulaştınız.");
      else setErrorMsg("Vaka başlatılırken bir hata oluştu.");
    }
  };
  
  async function handleRestartCase(sessionId: string) {
    nativeClient.impact();
    setRestartingSessionId(sessionId);
    try {
      const sessionRes = await sessionsApi.getSession(sessionId);
      const caseId = sessionRes.data.case_id;
      const newSession = await sessionsApi.create(caseId);
      router.push(`/case?id=${newSession.data.id}`);
    } catch (err: any) {
      setActiveTab("randomizer");
      setErrorMsg(err.response?.data?.detail || "Vaka yeniden başlatılamadı, lütfen tekrar deneyin.");
    } finally {
      setRestartingSessionId(null);
    }
  }

  async function fetchMe() {
    try {
      const res = await authApi.me();
      setUserProfile(res.data);
      setProfileName(res.data.name || "");
      setProfileSchool(res.data.school || "");
      setProfileYear(res.data.year ? String(res.data.year) : "");
    } catch {}
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSaveMsg(null);
    try {
      const res = await usersApi.updateProfile({
        name: profileName.trim() || undefined,
        school: profileSchool.trim() || undefined,
        year: profileYear ? parseInt(profileYear) : undefined,
      });
      setUserProfile(res.data);
      setIsEditingProfile(false);
      setProfileSaveMsg("ok");
      setTimeout(() => setProfileSaveMsg(null), 2500);
    } catch {
      setProfileSaveMsg("err");
      setTimeout(() => setProfileSaveMsg(null), 2500);
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      setPasswordMsg("Mevcut ve yeni şifre alanlarını doldurun.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg("Yeni şifre ve doğrulama eşleşmiyor.");
      return;
    }

    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg("ok");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setPasswordMsg(typeof detail === "string" ? detail : "Şifre güncellenemedi.");
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(null), 3000);
    }
  }

  async function fetchHistory() {
    try {
      const res = await usersApi.history();
      setHistory(res.data);
    } catch {}
  }

  const toggleSpecialty = (val: string) => {
    if (selectedSpecs.includes(val)) {
        setSelectedSpecs(selectedSpecs.filter(s => s !== val));
    } else {
        setSelectedSpecs([...selectedSpecs, val]);
    }
  };

  const handleStartRandomCase = async () => {
    nativeClient.impact();
    setIsStarting(true);
    setErrorMsg("");
    setFilterSuggestion(null);
    try {
        const specsParam = selectedSpecs.length > 0 ? selectedSpecs.join(",") : undefined;
        // 1. Get a random case
        const randomRes = await casesApi.getRandom({ specialties: specsParam, difficulty: difficulty || undefined });
        const caseId = randomRes.data.id;

        // 2. Start session
        const sessionRes = await sessionsApi.create(caseId);
        router.push(`/case?id=${sessionRes.data.id}`);

    } catch (err: any) {
        if (err.response?.status === 404) {
            setErrorMsg("Bu kriterlerde çözülmemiş yeni vaka bulunamadı.");
            // Filtre genişletme önerisi hesapla
            const diffOrder = ["", "easy", "medium", "hard"];
            const currentDiffIdx = diffOrder.indexOf(difficulty);
            if (currentDiffIdx > 1) {
              // hard→medium veya medium→easy
              const lowerDiff = diffOrder[currentDiffIdx - 1];
              const lowerLabel = DIFFICULTIES.find(d => d.value === lowerDiff)?.label ?? lowerDiff;
              setFilterSuggestion({ label: `Zorluğu "${lowerLabel}" olarak dene`, specs: selectedSpecs, difficulty: lowerDiff });
            } else if (selectedSpecs.length > 0) {
              setFilterSuggestion({ label: "Tüm branşlara genişlet", specs: [], difficulty });
            } else {
              setFilterSuggestion({ label: "Tüm filtreleri temizle ve dene", specs: [], difficulty: "" });
            }
        } else if (err.response?.status === 403) {
            setErrorMsg(err.response.data.detail || "Günlük limitinize ulaştınız.");
        } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout") || !navigator.onLine) {
            setErrorMsg("Sunucu yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.");
        } else {
            setErrorMsg("Geçici bir sorun oluştu. Lütfen tekrar deneyin.");
        }
    } finally {
        setIsStarting(false);
    }
  };

  // İstatistikleri "Eşsiz (Unique) Vakalar" üzerinden hesapla (Farming engellemesi)
  const completedHistory = history.filter((h) => h.status === "completed" && h.score != null);
  const bestScoresByCase = new Map<string, number>();
  
  completedHistory.forEach(h => {
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

  // Daily usage calculation
  const today = new Date().setHours(0,0,0,0);
  const todaySessions = history.filter(h => new Date(h.started_at).getTime() >= today).length;
  const dailyLimit = userProfile?.daily_limit || 3;
  const isLimitReached = !userProfile?.is_admin && todaySessions >= dailyLimit;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="border-b sticky top-0 z-[100]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-md flex items-center justify-center transition-opacity group-hover:opacity-90"
              style={{ background: "var(--accent)" }}>
              <Stethoscope className="w-4 h-4" style={{ color: "var(--accent-foreground)" }} />
            </div>
            <span className="font-semibold text-lg tracking-tight" style={{ color: "var(--text)" }}>KlinikIQ</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                nativeClient.impact();
                setOpenNavMenu((m) => (m === "study" ? null : "study"));
              }}
              className="flex items-center gap-0.5 sm:gap-1 transition-all text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-2 rounded-lg border"
              style={{
                background: openNavMenu === "study" ? "var(--surface-2)" : "transparent",
                borderColor: openNavMenu === "study" ? "var(--foreground)" : "var(--border)",
                color: "var(--text)",
              }}
              aria-expanded={openNavMenu === "study"}
              aria-haspopup="true"
              title="Öğren — histoloji, atlas, sorular"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--foreground)" }} />
              <span className="max-[360px]:hidden">Öğren</span>
              <ChevronDown className={`w-3 h-3 shrink-0 opacity-70 transition-transform ${openNavMenu === "study" ? "rotate-180" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                nativeClient.impact();
                setOpenNavMenu((m) => (m === "account" ? null : "account"));
              }}
              className="flex items-center gap-0.5 sm:gap-1 transition-all text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-2 rounded-lg border"
              style={{
                background: openNavMenu === "account" ? "var(--surface-2)" : "transparent",
                borderColor: openNavMenu === "account" ? "var(--foreground)" : "var(--border)",
                color: "var(--text)",
              }}
              aria-expanded={openNavMenu === "account"}
              aria-haspopup="true"
              title="Hesap — ayarlar ve çıkış"
            >
              <User className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--foreground)" }} />
              <span className="max-[360px]:hidden">Hesap</span>
              <ChevronDown className={`w-3 h-3 shrink-0 opacity-70 transition-transform ${openNavMenu === "account" ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </nav>

      {openNavMenu && (
        <>
          <div
            className="fixed inset-0 top-16 z-[105] bg-black/35 backdrop-blur-[1px]"
            aria-hidden
            onClick={() => setOpenNavMenu(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              openNavMenu === "study"
                ? "Öğren menüsü"
                : "Hesap menüsü"
            }
            className="fixed left-3 right-3 top-[4.25rem] z-[110] sm:left-auto sm:right-6 sm:w-[min(100vw-3rem,22rem)] rounded-lg border shadow-lg max-h-[min(72vh,440px)] overflow-y-auto"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="p-2 space-y-0.5">
              {openNavMenu === "study" && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>Öğren ve pratik</p>
                  <Link
                    href="/calis"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
                    Günlük çalışma
                  </Link>
                  <Link
                    href="/ogrenme"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                    Vaka özetleri (havuz)
                  </Link>
                  <Link
                    href="/study-notes"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <PenLine className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    Kişisel özetler
                  </Link>
                  <Link
                    href="/histology"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Microscope className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    Histoloji
                  </Link>
                  <Link
                    href="/sinir-lezyon"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Brain className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    Nöro lezyon atlası
                  </Link>
                  <Link
                    href="/calis/oturum?mode=usmle"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <GraduationCap className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    USMLE (gelişmiş)
                  </Link>
                  <Link
                    href="/simulasyon"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Zap className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    Simülasyon (acil)
                  </Link>
                  <Link
                    href="/farmakoloji/haritalar"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Pill className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    Farmakoloji
                  </Link>
                  <Link
                    href="/leaderboard"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--warning)" }} />
                    Sıralama
                  </Link>
                </>
              )}
              {openNavMenu === "account" && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>Hesap</p>
                  {userProfile?.is_admin && (
                    <Link
                      href="/admin"
                      onClick={() => {
                        nativeClient.impact();
                        setOpenNavMenu(null);
                      }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors"
                      style={{
                        background: "color-mix(in srgb, var(--error) 8%, transparent)",
                        color: "var(--error)",
                        border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)",
                      }}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      Yönetim paneli
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      nativeClient.impact();
                      setOpenNavMenu(null);
                      setShowSettings(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text)" }}
                  >
                    <Settings className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
                    Ayarlar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenNavMenu(null);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Çıkış yap
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <main className="relative z-0 flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        {/* AI Disclaimer & Limit Banner */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
            <div className="flex-1 flex items-center gap-2.5 border rounded-lg px-4 py-3 text-[10px] sm:text-xs"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--foreground)" }} />
              <span className="leading-tight">
                  <span className="font-medium" style={{ color: "var(--text)" }}>AI simülasyon</span>
                  {" "}— Yanıtlar yapay zekadır. Klinik karar için kullanmayın.
              </span>
            </div>
            
            {userProfile && (
                <div className="flex items-center gap-3 border rounded-lg px-4 py-3 text-xs sm:text-sm font-medium"
                  style={{ 
                    background: "var(--surface)",
                    borderColor: isLimitReached ? "var(--destructive)" : "var(--border)",
                    color: isLimitReached ? "var(--destructive)" : "var(--text-muted)"
                  }}>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    {userProfile.is_admin ? (
                        <span style={{ color: "var(--text)" }}>Sınırsız vaka (admin)</span>
                    ) : (
                        <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
                            <span>Limit: {Math.max(0, dailyLimit - todaySessions)} / {dailyLimit}</span>
                            <a href="mailto:drguevenfurkan@icloud.com" className="underline decoration-dotted underline-offset-4 opacity-70">Artır</a>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Stats Section */}
        <div className="flex justify-center mb-6 sm:mb-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-4xl">
            <div className="card p-3 sm:p-5 border" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-2)" }}>
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "var(--foreground)" }} />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[10px] sm:text-xs font-medium" style={{ color: "var(--muted)" }}>Vakalar</span>
                    <p className="text-lg sm:text-2xl font-semibold tabular-nums mt-[-2px] sm:mt-0" style={{ color: "var(--text)" }}>{uniqueTotalCount}</p>
                </div>
              </div>
            </div>

            <div className="card p-3 sm:p-5 border" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-2)" }}>
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "var(--foreground)" }} />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[10px] sm:text-xs font-medium" style={{ color: "var(--muted)" }}>Ort. skor</span>
                    <div className="flex items-baseline gap-0.5">
                        <p className="text-lg sm:text-2xl font-semibold tabular-nums mt-[-2px] sm:mt-0" style={{ color: "var(--text)" }}>{avgScore != null ? avgScore : "—"}</p>
                        {avgScore != null && <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>/100</span>}
                    </div>
                </div>
              </div>
            </div>

            <div className="card p-3 sm:p-5 border" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-2)" }}>
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "var(--foreground)" }} />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[10px] sm:text-xs font-medium" style={{ color: "var(--muted)" }}>Tamamlanan</span>
                    <p className="text-lg sm:text-2xl font-semibold tabular-nums mt-[-2px] sm:mt-0" style={{ color: "var(--text)" }}>{uniqueCompletedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acil MCQ + oturum raporu — doğrudan erişim (Öğren menüsünde de var) */}
        <div
          className="mb-5 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-lg px-5 py-4 border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--surface-2)" }}
            >
              <Zap className="w-5 h-5" style={{ color: "var(--foreground)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                Acil simülasyon (MCQ)
              </p>
              <p className="text-xs leading-snug mt-0.5" style={{ color: "var(--text-muted)" }}>
                Süre baskılı sorular, AI asistan ve kayıtlı oturum raporu. Klasik vaka limitinden bağımsız pratik.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
            <Link
              href="/calis/oturum?mode=acil"
              className="btn-primary text-center px-5 py-2.5 text-xs rounded-lg"
            >
              Başla
            </Link>
            <Link
              href="/simulasyon/acil/raporlar"
              className="btn-secondary text-center px-5 py-2.5 text-xs rounded-lg"
            >
              Raporlarım
            </Link>
            <Link
              href="/simulasyon"
              className="text-center px-5 py-2.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/[0.03]"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              Simülasyon hub
            </Link>
          </div>
        </div>

        {/* Aktif oturum kart */}
        {(() => {
          const activeSession = history.find(h => h.status === "active");
          if (!activeSession) return null;
          return (
            <div
              className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg px-5 py-4 border animate-fade-in-up"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent)" }}>
                  <Play className="w-4 h-4" style={{ color: "var(--accent-foreground)" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>
                    Devam eden vaka
                  </p>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {activeSession.case_title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {activeSession.specialty} · {activeSession.difficulty} · {timeAgo(activeSession.started_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { nativeClient.impact(); router.push(`/case?id=${activeSession.session_id}`); }}
                className="btn-primary shrink-0 px-5 py-2.5 text-sm rounded-lg w-full sm:w-auto"
              >
                Devam et
              </button>
            </div>
          );
        })()}

        {/* Tab navigasyon */}
        <div className="flex gap-1 p-1 rounded-lg w-fit mb-6 border"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
          {(["randomizer", "history"] as const).map((tab) => {
            const incompleteCount = history.filter(h => h.status === "active" || h.status === "abandoned").length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: activeTab === tab ? "var(--accent)" : "transparent",
                  color: activeTab === tab ? "var(--accent-foreground)" : "var(--text-muted)"
                }}
              >
                {tab === "randomizer" ? "Yepyeni Vaka Çöz" : "Geçmişim"}
                {tab === "history" && incompleteCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-semibold flex items-center justify-center"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                    {incompleteCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "randomizer" && (
            <div className="grid grid-cols-1 gap-6">
                <div className="md:col-span-12">
                    <div className="card p-5 sm:p-10 relative overflow-hidden">
                        <div className="mb-6 sm:mb-10 relative">
                            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-3 mb-2" style={{ color: "var(--text)" }}>
                                <Dna className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: "var(--foreground)" }} />
                                Vaka Oluşturucu
                            </h2>
                            <p className="text-xs sm:text-base opacity-60 font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                Seçtiğiniz branşlardan, daha önce karşılaşmadığınız <b>eşsiz</b> bir vaka hazırlayalım.
                            </p>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-xs sm:text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>Branş seçimi</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedSpecs([])}
                                    className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all border ${
                                        selectedSpecs.length === 0 
                                            ? "" 
                                            : "hover:border-[var(--foreground)]"
                                    }`}
                                    style={{ 
                                      background: selectedSpecs.length === 0 ? "var(--accent)" : "var(--surface-2)", 
                                      borderColor: selectedSpecs.length === 0 ? "var(--accent)" : "var(--border)",
                                      color: selectedSpecs.length === 0 ? "var(--accent-foreground)" : "var(--text-muted)"
                                    }}
                                >
                                    Karışık
                                </button>
                                {SPECIALTIES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => toggleSpecialty(s.value)}
                                        className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all border flex items-center gap-2 ${
                                            selectedSpecs.includes(s.value)
                                                ? "" 
                                                : "hover:border-[var(--foreground)]"
                                        }`}
                                        style={{ 
                                          background: selectedSpecs.includes(s.value) ? "var(--accent)" : "var(--surface-2)", 
                                          borderColor: selectedSpecs.includes(s.value) ? "var(--accent)" : "var(--border)",
                                          color: selectedSpecs.includes(s.value) ? "var(--accent-foreground)" : "var(--text-muted)"
                                        }}
                                    >
                                        {s.label}
                                        {selectedSpecs.includes(s.value) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-xs sm:text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>Zorluk</label>
                            <div className="flex gap-1 p-1 rounded-lg border w-fit" 
                              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                                {DIFFICULTIES.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all"
                                        style={{ 
                                          background: difficulty === d.value ? "var(--surface)" : "transparent",
                                          color: difficulty === d.value ? "var(--text)" : "var(--text-muted)",
                                          borderColor: difficulty === d.value ? "var(--border)" : "transparent",
                                          borderWidth: 1
                                        }}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 space-y-2">
                              <div className="p-4 rounded-lg flex items-center gap-3 text-xs font-medium border"
                                style={{ background: "var(--destructive-muted)", borderColor: "var(--destructive)", color: "var(--destructive)" }}>
                                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                  {errorMsg}
                              </div>
                              {filterSuggestion && (
                                <button
                                  onClick={() => {
                                    nativeClient.impact();
                                    setSelectedSpecs(filterSuggestion.specs);
                                    setDifficulty(filterSuggestion.difficulty);
                                    setFilterSuggestion(null);
                                    setErrorMsg("");
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/[0.03]"
                                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                >
                                  <Filter className="w-3.5 h-3.5" />
                                  {filterSuggestion.label}
                                </button>
                              )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleStartRandomCase}
                            disabled={isStarting || isRecommending || isLimitReached}
                            className={`btn-primary flex-1 py-4 text-base rounded-lg ${
                              isStarting || isLimitReached ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            {isStarting ? "Hazırlanıyor..." : isLimitReached ? "Limit Doldu" : "Vaka Başlat"}
                          </button>

                          <button
                            onClick={handleRecommendedCase}
                            disabled={isStarting || isRecommending || isLimitReached}
                            className={`btn-secondary px-6 py-4 text-base rounded-lg flex items-center justify-center gap-2 ${
                              isRecommending || isLimitReached ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Önerilen</span>
                          </button>
                        </div>

                        {history.some(h => h.status === "active" || h.status === "abandoned") && (
                          <p className="mt-6 text-center text-[11px] font-medium opacity-40" style={{ color: "var(--text-muted)" }}>
                            Yarım kalan vakalarına{" "}
                            <button
                              onClick={() => setActiveTab("history")}
                              className="underline underline-offset-2 opacity-100 transition-opacity hover:opacity-70"
                              style={{ color: "var(--foreground)" }}
                            >
                              Geçmişim
                            </button>
                            {" "}sekmesinden devam edebilirsin.
                          </p>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed" 
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium opacity-60">Henüz hiç vaka çalışmadın.</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.session_id}
                  className="card p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-base sm:text-lg mb-1" style={{ color: "var(--text)" }}>{item.case_title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                      <span className="px-2 py-0.5 rounded-lg" style={{ background: "var(--surface-2)" }}>{item.specialty}</span>
                      <span className="px-2 py-0.5 rounded-lg" style={{ background: "var(--surface-2)" }}>{item.difficulty}</span>
                      <span
                        className="px-2 py-0.5 rounded-md border text-[10px] font-medium"
                        style={{
                          borderColor: "var(--border)",
                          color: item.status === "active"
                            ? "var(--text)"
                            : item.status === "abandoned"
                              ? "var(--destructive)"
                              : "var(--muted)",
                        }}
                      >
                        {item.status === "active"
                          ? "Devam Ediyor"
                          : item.status === "abandoned"
                            ? "Yarım Kaldı"
                            : "Tamamlandı"}
                      </span>
                      <span className="opacity-60">
                        {timeAgo(item.status === "active" ? item.started_at : (item.ended_at || item.started_at))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:pl-4 transition-all" style={{ borderColor: "var(--border)" }}>
                    {item.score != null && (
                      <div className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                        {item.score}/100
                      </div>
                    )}
                    {item.status === "completed" && (
                      <button
                        onClick={() => router.push(`/report?id=${item.session_id}`)}
                        className="btn-secondary px-5 py-2.5 text-xs active:scale-95"
                      >
                        Rapor
                      </button>
                    )}
                    {item.status === "active" && (
                      <button
                        onClick={() => router.push(`/case?id=${item.session_id}`)}
                        className="btn-primary px-5 py-2.5 text-xs active:scale-95"
                      >
                        Devam Et
                      </button>
                    )}
                    {item.status === "abandoned" && (
                      <button
                        onClick={() => handleRestartCase(item.session_id)}
                        disabled={restartingSessionId === item.session_id}
                        className="btn-secondary flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg disabled:opacity-50"
                      >
                        {restartingSessionId === item.session_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Yeniden Başlat
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Footer />
        {/* Settings Modal */}
        {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSettings(false); setIsEditingProfile(false); setProfileSaveMsg(null); setPasswordMsg(null); }} />
                <div className="relative w-full max-w-md card p-6 sm:p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-semibold tracking-tight">Ayarlar</h3>
                        <button onClick={() => { setShowSettings(false); setIsEditingProfile(false); setProfileSaveMsg(null); setPasswordMsg(null); }} className="opacity-40 hover:opacity-100 p-1"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-8">
                        {/* Profile Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-medium uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Profil bilgileri</p>
                                {!isEditingProfile ? (
                                    <button
                                        onClick={() => { nativeClient.impact(); setIsEditingProfile(true); setProfileSaveMsg(null); }}
                                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                    >
                                        <Edit2 className="w-3 h-3" /> Düzenle
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setIsEditingProfile(false); setProfileName(userProfile?.name || ""); setProfileSchool(userProfile?.school || ""); setProfileYear(userProfile?.year ? String(userProfile.year) : ""); }}
                                            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                                            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                                        >
                                            İptal
                                        </button>
                                        <button
                                            onClick={saveProfile}
                                            disabled={profileSaving}
                                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors btn-primary"
                                        >
                                            {profileSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Kaydet
                                        </button>
                                    </div>
                                )}
                            </div>

                            {profileSaveMsg === "ok" && (
                                <div className="mb-3 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2"
                                    style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                                    <Check className="w-3.5 h-3.5" /> Profil başarıyla güncellendi
                                </div>
                            )}
                            {profileSaveMsg === "err" && (
                                <div className="mb-3 px-3 py-2 rounded-xl text-[11px] font-bold"
                                    style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}>
                                    Kayıt sırasında bir hata oluştu.
                                </div>
                            )}

                            <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                {/* Email — sadece göster */}
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 shrink-0 opacity-40" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>E-posta</p>
                                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-muted)" }}>{userProfile?.email}</p>
                                    </div>
                                </div>

                                {/* Ad Soyad */}
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>Ad soyad</p>
                                        {isEditingProfile ? (
                                            <input
                                                value={profileName}
                                                onChange={(e) => setProfileName(e.target.value)}
                                                className="w-full bg-transparent text-xs font-bold outline-none border-b pb-0.5 transition-colors"
                                                style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                                placeholder="Adınız Soyadınız"
                                            />
                                        ) : (
                                            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{userProfile?.name || "—"}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Okul */}
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>Okul</p>
                                        {isEditingProfile ? (
                                            <input
                                                value={profileSchool}
                                                onChange={(e) => setProfileSchool(e.target.value)}
                                                className="w-full bg-transparent text-xs font-bold outline-none border-b pb-0.5 transition-colors"
                                                style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                                placeholder="Tıp Fakültesi"
                                            />
                                        ) : (
                                            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{userProfile?.school || "—"}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Sınıf */}
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>Sınıf</p>
                                        {isEditingProfile ? (
                                            <input
                                                type="number"
                                                min={1}
                                                max={6}
                                                value={profileYear}
                                                onChange={(e) => setProfileYear(e.target.value)}
                                                className="w-full bg-transparent text-xs font-bold outline-none border-b pb-0.5 transition-colors"
                                                style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                                placeholder="1–6"
                                            />
                                        ) : (
                                            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{userProfile?.year ? `${userProfile.year}. Sınıf` : "—"}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Şifre değiştir</p>
                            <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                <div className="flex items-center gap-2 text-[11px] font-bold opacity-70" style={{ color: "var(--text-muted)" }}>
                                    <KeyRound className="w-3.5 h-3.5" />
                                    Güvenlik için mevcut şifreniz doğrulanır.
                                </div>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-transparent text-xs font-bold outline-none border rounded-xl px-3 py-2"
                                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                    placeholder="Mevcut şifre"
                                />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-transparent text-xs font-bold outline-none border rounded-xl px-3 py-2"
                                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                    placeholder="Yeni şifre (min 6 karakter)"
                                />
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full bg-transparent text-xs font-bold outline-none border rounded-xl px-3 py-2"
                                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                    placeholder="Yeni şifre (tekrar)"
                                />
                                <button
                                    onClick={changePassword}
                                    disabled={passwordSaving}
                                    className="w-full btn-primary flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg"
                                >
                                    {passwordSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                                    Şifreyi Güncelle
                                </button>
                                {passwordMsg === "ok" && (
                                    <div className="px-3 py-2 rounded-xl text-[11px] font-bold" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                                        Şifre başarıyla güncellendi.
                                    </div>
                                )}
                                {passwordMsg && passwordMsg !== "ok" && (
                                    <div className="px-3 py-2 rounded-xl text-[11px] font-bold" style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}>
                                        {passwordMsg}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Biometric Toggle */}
                        {biometricsAvailable && (
                            <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="w-5 h-5" style={{ color: "var(--foreground)" }} />
                                    <div>
                                        <p className="text-xs font-semibold">Parmak İzi</p>
                                        <p className="text-[10px] opacity-50">Hızlı Giriş</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleBiometrics}
                                    className="w-12 h-6 rounded-full transition-all relative"
                                    style={{ background: isBiometricsEnabled ? "var(--accent)" : "var(--border-strong)" }}
                                >
                                    <div
                                      className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isBiometricsEnabled ? "left-7" : "left-1"}`}
                                      style={{ background: isBiometricsEnabled ? "var(--accent-foreground)" : "var(--surface)" }}
                                    />
                                </button>
                            </div>
                        )}

                        {/* Theme Toggle Button */}
                        <button
                            onClick={() => { nativeClient.impact(); toggleTheme(); }}
                            className="w-full flex items-center justify-between p-4 rounded-lg border"
                            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                        >
                            <div className="flex items-center gap-3">
                                {theme === "dark" ? <Sun className="w-5 h-5" style={{ color: "var(--foreground)" }} /> : <Moon className="w-5 h-5" style={{ color: "var(--foreground)" }} />}
                                <p className="text-xs font-semibold">{theme === "dark" ? "Gündüz Modu" : "Gece Modu"}</p>
                            </div>
                            <span className="text-[10px] font-bold opacity-40 uppercase">Değiştir</span>
                        </button>
                    </div>

                    <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                        <button onClick={logout} className="w-full py-4 text-xs font-medium flex items-center justify-center gap-2" style={{ color: "var(--destructive)" }}>
                            <LogOut className="w-4 h-4" /> Oturumu Kapat
                        </button>
                    </div>
                </div>
            </div>
        )}

        <PremiumAlert 
            isOpen={showBioInfo}
            onClose={() => setShowBioInfo(false)}
            title="Sistem Hazır"
            message="Biyometrik giriş altyapısı hazırlandı. Tam aktif olması için bir sonraki girişinizde size sorulduğunda 'Evet' demeniz yeterlidir."
            confirmText="Anladım"
            type="success"
        />
    </div>
  );
}
