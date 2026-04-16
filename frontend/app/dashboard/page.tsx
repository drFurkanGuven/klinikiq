"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { casesApi, usersApi, authApi, sessionsApi, questionsApi, type HistoryItem, type UserOut, type QuestionStats } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import {
  Stethoscope, LogOut, BookOpen, Trophy, BarChart3, Clock, Bot, ShieldAlert, Dna, Play, CheckCircle2, AlertCircle, Sparkles, GraduationCap, Microscope, Brain, Settings, X, Check, Fingerprint, Sun, Moon, User, Edit2, Save, Loader2
} from "lucide-react";
import { nativeClient } from "@/lib/native";
import { biometricsClient } from "@/lib/biometrics";
import { storage } from "@/lib/storage";
import { useTheme, type Palette } from "@/components/ThemeProvider";
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

  const { theme, toggleTheme, palette, setPalette } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

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
            setErrorMsg("Seçtiğiniz kriterlerde yeni/çözülmemiş vaka bulunamadı!");
        } else if (err.response?.status === 403) {
            setErrorMsg(err.response.data.detail || "Günlük limitinize ulaştınız.");
        } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
            setErrorMsg("Sunucu yanıt vermedi. Lütfen tekrar deneyin.");
        } else {
            setErrorMsg("Vaka başlatılırken bir hata oluştu.");
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
      <nav className="glass border-b sticky top-0 z-50 transition-all" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer transition-transform hover:scale-105">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--primary)" }}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text)" }}>KlinikIQ</span>
          </Link>

          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-4 mr-1 sm:mr-4 overflow-x-auto no-scrollbar">
            {userProfile?.is_admin && (
                <Link href="/admin" className="flex items-center gap-1.5 transition-all text-[10px] sm:text-sm font-bold px-2 py-1.5 rounded-lg border shadow-sm shrink-0"
                  style={{ background: "color-mix(in srgb, var(--error) 10%, transparent)", borderColor: "var(--error)", color: "var(--error)" }}>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Admin</span>
                </Link>
            )}
            <Link href="/histology" className="flex items-center gap-1.5 transition-all text-[10px] sm:text-sm font-bold px-2 py-1.5 rounded-lg border shadow-sm shrink-0"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Microscope className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span className="hidden lg:inline">Histoloji</span>
            </Link>
            <Link href="/sinir-lezyon" className="flex items-center gap-1.5 transition-all text-[10px] sm:text-sm font-bold px-2 py-1.5 rounded-lg border shadow-sm shrink-0"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Brain className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span className="hidden lg:inline">Nöroloji</span>
            </Link>
            <Link href="/questions" className="flex items-center gap-1.5 transition-all text-[10px] sm:text-sm font-bold px-2 py-1.5 rounded-lg border shadow-sm shrink-0"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <GraduationCap className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span className="hidden lg:inline">Sorular</span>
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 transition-all text-[10px] sm:text-sm font-bold px-2 py-1.5 rounded-lg border shadow-sm shrink-0"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Trophy className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} />
              <span className="hidden lg:inline">Sıralama</span>
            </Link>
            <button
                onClick={() => { nativeClient.impact(); setShowSettings(true); }}
                className="flex items-center gap-1.5 transition-all text-[10px] sm:text-sm font-bold px-2 py-1.5 rounded-lg border shadow-sm shrink-0"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
                <Settings className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span className="hidden lg:inline">Ayarlar</span>
            </button>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 text-[10px] sm:text-sm transition-colors px-2 py-2 rounded-lg hover:bg-slate-500/10 shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        {/* AI Disclaimer & Limit Banner */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
            <div className="flex-1 flex items-center gap-2.5 border rounded-2xl px-4 py-3 text-[10px] sm:text-xs shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
              <span className="leading-tight">
                  <span style={{ color: "var(--primary)", fontWeight: 800 }}>AI SİMÜLASYON</span>
                  {" "}— Yanıtlar yapay zekadır. Klinik karar için kullanmayın.
              </span>
            </div>
            
            {userProfile && (
                <div className={`flex items-center gap-3 border rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold shadow-sm transition-all`}
                  style={{ 
                    background: userProfile.is_admin ? "color-mix(in srgb, var(--primary) 10%, transparent)" : isLimitReached ? "color-mix(in srgb, var(--danger) 10%, transparent)" : "color-mix(in srgb, var(--success) 10%, transparent)",
                    borderColor: userProfile.is_admin ? "var(--primary)" : isLimitReached ? "var(--danger)" : "var(--success)",
                    color: userProfile.is_admin ? "var(--primary)" : isLimitReached ? "var(--danger)" : "var(--success)"
                  }}>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    {userProfile.is_admin ? (
                        <span>Sınırsız Vaka (Admin)</span>
                    ) : (
                        <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
                            <span>Limit: {Math.max(0, dailyLimit - todaySessions)} / {dailyLimit}</span>
                            <a href="mailto:drguevenfurkan@icloud.com" className="opacity-60 underline decoration-dotted underline-offset-4">Artır</a>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Stats Section */}
        <div className="flex justify-center mb-6 sm:mb-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-4xl">
            {/* Vakalar */}
            <div className="glass-card p-3 sm:p-5 border relative overflow-hidden group" 
                 style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                  <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[8px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-wider opacity-50" style={{ color: "var(--text-muted)" }}>Vakalar</span>
                    <p className="text-lg sm:text-3xl font-black mt-[-2px] sm:mt-0" style={{ color: "var(--text-navy)" }}>{uniqueTotalCount}</p>
                </div>
              </div>
            </div>

            {/* Ort. Skor */}
            <div className="glass-card p-3 sm:p-5 border relative overflow-hidden group border-t-2" 
                 style={{ background: "var(--surface)", borderColor: "var(--border)", borderTopColor: "var(--success)" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)" }}>
                  <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: "var(--success)" }} />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[8px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-wider opacity-50" style={{ color: "var(--text-muted)" }}>Ort. Skor</span>
                    <div className="flex items-baseline gap-0.5">
                        <p className="text-lg sm:text-3xl font-black mt-[-2px] sm:mt-0" style={{ color: "var(--text-navy)" }}>{avgScore != null ? avgScore : "—"}</p>
                        {avgScore != null && <span className="text-[8px] sm:text-xs font-bold opacity-30">/100</span>}
                    </div>
                </div>
              </div>
            </div>

            {/* Tamamlanan */}
            <div className="glass-card p-3 sm:p-5 border relative overflow-hidden group" 
                 style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
                  style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                  <BarChart3 className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[8px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-wider opacity-50" style={{ color: "var(--text-muted)" }}>Biten</span>
                    <p className="text-lg sm:text-3xl font-black mt-[-2px] sm:mt-0" style={{ color: "var(--text-navy)" }}>{uniqueCompletedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigasyon */}
        <div className="flex gap-1 p-1 rounded-xl w-fit mb-6 border shadow-inner" 
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
          {(["randomizer", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                activeTab === tab
                  ? "text-white"
                  : ""
              }`}
              style={{ 
                background: activeTab === tab ? "var(--primary)" : "transparent",
                color: activeTab === tab ? "#fff" : "var(--text-muted)"
              }}
            >
              {tab === "randomizer" ? "Yepyeni Vaka Çöz" : "Geçmişim"}
            </button>
          ))}
        </div>

        {activeTab === "randomizer" && (
            <div className="grid grid-cols-1 gap-6">
                <div className="md:col-span-12">
                    <div className="glass-card p-5 sm:p-10 border shadow-xl relative overflow-hidden" 
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all" 
                          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
                        
                        <div className="mb-6 sm:mb-10 relative">
                            <h2 className="text-xl sm:text-3xl font-black flex items-center gap-3 mb-2" style={{ color: "var(--text-navy)" }}>
                                <Dna className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: "var(--primary)" }} />
                                Vaka Oluşturucu
                            </h2>
                            <p className="text-xs sm:text-base opacity-60 font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                Seçtiğiniz branşlardan, daha önce karşılaşmadığınız <b style={{ color: "var(--text-navy)" }}>eşsiz</b> bir vaka hazırlayalım.
                            </p>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-3 opacity-50" style={{ color: "var(--text-muted)" }}>Branş Seçimi</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedSpecs([])}
                                    className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-sm ${
                                        selectedSpecs.length === 0 
                                            ? "" 
                                            : "hover:border-slate-400"
                                    }`}
                                    style={{ 
                                      background: selectedSpecs.length === 0 ? "var(--primary)" : "var(--surface-2)", 
                                      borderColor: selectedSpecs.length === 0 ? "var(--primary)" : "var(--border)",
                                      color: selectedSpecs.length === 0 ? "#fff" : "var(--text-muted)"
                                    }}
                                >
                                    Karışık
                                </button>
                                {SPECIALTIES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => toggleSpecialty(s.value)}
                                        className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center gap-2 shadow-sm ${
                                            selectedSpecs.includes(s.value)
                                                ? "" 
                                                : "hover:border-slate-400"
                                        }`}
                                        style={{ 
                                          background: selectedSpecs.includes(s.value) ? "var(--primary)" : "var(--surface-2)", 
                                          borderColor: selectedSpecs.includes(s.value) ? "var(--primary)" : "var(--border)",
                                          color: selectedSpecs.includes(s.value) ? "#fff" : "var(--text-muted)"
                                        }}
                                    >
                                        {s.label}
                                        {selectedSpecs.includes(s.value) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-3 opacity-50" style={{ color: "var(--text-muted)" }}>Zorluk</label>
                            <div className="flex gap-1.5 p-1 rounded-2xl border shadow-inner w-fit" 
                              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                                {DIFFICULTIES.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                                            difficulty === d.value
                                                ? "shadow-md"
                                                : ""
                                        }`}
                                        style={{ 
                                          background: difficulty === d.value ? "var(--surface)" : "transparent",
                                          color: difficulty === d.value ? "var(--primary)" : "var(--text-muted)",
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
                            <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border"
                              style={{ background: "var(--error-light)", borderColor: "var(--error-light)", color: "var(--danger)" }}>
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {errorMsg}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleStartRandomCase}
                            disabled={isStarting || isRecommending || isLimitReached}
                            className={`btn-premium flex-1 py-4 text-base rounded-2xl active:scale-95 ${
                              isStarting || isLimitReached ? "opacity-50 grayscale cursor-not-allowed" : ""
                            }`}
                          >
                            {isStarting ? "Hazırlanıyor..." : isLimitReached ? "Limit Doldu" : "Vaka Başlat"}
                          </button>

                          <button
                            onClick={handleRecommendedCase}
                            disabled={isStarting || isRecommending || isLimitReached}
                            className={`btn-premium px-6 py-4 text-base rounded-2xl active:scale-95 flex items-center justify-center gap-2 ${
                              isRecommending || isLimitReached ? "opacity-50 grayscale cursor-not-allowed" : ""
                            }`}
                            style={{ background: "transparent", border: "2px solid var(--primary)", color: "var(--primary)" }}
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Önerilen</span>
                          </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed" 
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium opacity-60">Henüz hiç vaka çalışmadın.</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.session_id}
                  className="glass-card p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex-1">
                    <p className="font-black text-base sm:text-lg mb-1" style={{ color: "var(--text-navy)" }}>{item.case_title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider opacity-60" style={{ color: "var(--text-muted)" }}>
                      <span className="px-2 py-0.5 rounded-lg" style={{ background: "var(--surface-2)" }}>{item.specialty}</span>
                      <span className="px-2 py-0.5 rounded-lg" style={{ background: "var(--surface-2)" }}>{item.difficulty}</span>
                      <span className="opacity-60">{new Date(item.started_at).toLocaleDateString("tr-TR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:pl-4 transition-all" style={{ borderColor: "var(--border)" }}>
                    {item.score != null && (
                      <div className="text-lg sm:text-xl font-black" style={{ 
                        color: item.score >= 70 ? "var(--success)" : item.score >= 50 ? "var(--warning)" : "var(--danger)" 
                      }}>
                        {item.score}/100
                      </div>
                    )}
                    {item.status === "completed" && (
                      <button
                        onClick={() => router.push(`/report?id=${item.session_id}`)}
                        className="btn-premium px-5 py-2.5 text-xs active:scale-95"
                        style={{ background: "transparent", border: "2px solid var(--primary)", color: "var(--primary)" }}
                      >
                        Rapor
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
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSettings(false); setIsEditingProfile(false); setProfileSaveMsg(null); }} />
                <div className="relative w-full max-w-md glass-card p-6 sm:p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)" }}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black tracking-tight">Ayarlar</h3>
                        <button onClick={() => { setShowSettings(false); setIsEditingProfile(false); setProfileSaveMsg(null); }} className="opacity-40 hover:opacity-100 p-1"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-8">
                        {/* Profile Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Profil Bilgileri</p>
                                {!isEditingProfile ? (
                                    <button
                                        onClick={() => { nativeClient.impact(); setIsEditingProfile(true); setProfileSaveMsg(null); }}
                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all"
                                        style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
                                    >
                                        <Edit2 className="w-3 h-3" /> Düzenle
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setIsEditingProfile(false); setProfileName(userProfile?.name || ""); setProfileSchool(userProfile?.school || ""); setProfileYear(userProfile?.year ? String(userProfile.year) : ""); }}
                                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all"
                                            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                                        >
                                            İptal
                                        </button>
                                        <button
                                            onClick={saveProfile}
                                            disabled={profileSaving}
                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all text-white"
                                            style={{ background: "var(--primary)" }}
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

                            <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                {/* Email — sadece göster */}
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 shrink-0 opacity-40" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">E-posta</p>
                                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-muted)" }}>{userProfile?.email}</p>
                                    </div>
                                </div>

                                {/* Ad Soyad */}
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">Ad Soyad</p>
                                        {isEditingProfile ? (
                                            <input
                                                value={profileName}
                                                onChange={(e) => setProfileName(e.target.value)}
                                                className="w-full bg-transparent text-xs font-bold outline-none border-b pb-0.5 transition-colors"
                                                style={{ borderColor: "var(--primary)", color: "var(--text)" }}
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
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">Okul</p>
                                        {isEditingProfile ? (
                                            <input
                                                value={profileSchool}
                                                onChange={(e) => setProfileSchool(e.target.value)}
                                                className="w-full bg-transparent text-xs font-bold outline-none border-b pb-0.5 transition-colors"
                                                style={{ borderColor: "var(--primary)", color: "var(--text)" }}
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
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">Sınıf</p>
                                        {isEditingProfile ? (
                                            <input
                                                type="number"
                                                min={1}
                                                max={6}
                                                value={profileYear}
                                                onChange={(e) => setProfileYear(e.target.value)}
                                                className="w-full bg-transparent text-xs font-bold outline-none border-b pb-0.5 transition-colors"
                                                style={{ borderColor: "var(--primary)", color: "var(--text)" }}
                                                placeholder="1–6"
                                            />
                                        ) : (
                                            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{userProfile?.year ? `${userProfile.year}. Sınıf` : "—"}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Palette Selector */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-40">Renk Paleti</p>
                            <div className="flex justify-between gap-2">
                                {(["emerald", "midnight", "violet", "rose"] as Palette[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => { nativeClient.impact(); setPalette(p); }}
                                        className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center shadow-lg border-2 ${palette === p ? "border-primary scale-110" : "border-transparent opacity-60"}`}
                                        style={{ background: p === "emerald" ? "#4a7c59" : p === "midnight" ? "#334155" : p === "violet" ? "#7c3aed" : "#be123c" }}
                                    >
                                        {palette === p && <Check className="w-5 h-5 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Biometric Toggle */}
                        {biometricsAvailable && (
                            <div className="flex items-center justify-between p-4 rounded-2xl border bg-surface-2" style={{ borderColor: "var(--border)" }}>
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="text-xs font-black">Parmak İzi</p>
                                        <p className="text-[10px] opacity-50">Hızlı Giriş</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleBiometrics}
                                    className={`w-12 h-6 rounded-full transition-all relative ${isBiometricsEnabled ? "bg-primary" : "bg-slate-300"}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isBiometricsEnabled ? "left-7" : "left-1"}`} />
                                </button>
                            </div>
                        )}

                        {/* Theme Toggle Button */}
                        <button
                            onClick={() => { nativeClient.impact(); toggleTheme(); }}
                            className="w-full flex items-center justify-between p-4 rounded-2xl border bg-surface-2"
                            style={{ borderColor: "var(--border)" }}
                        >
                            <div className="flex items-center gap-3">
                                {theme === "dark" ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-primary" />}
                                <p className="text-xs font-black">{theme === "dark" ? "Gündüz Modu" : "Gece Modu"}</p>
                            </div>
                            <span className="text-[10px] font-bold opacity-40 uppercase">Değiştir</span>
                        </button>
                    </div>

                    <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                        <button onClick={logout} className="w-full py-4 text-xs font-black uppercase tracking-widest text-danger flex items-center justify-center gap-2">
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
