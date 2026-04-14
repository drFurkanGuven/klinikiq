"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { casesApi, usersApi, authApi, sessionsApi, questionsApi, type Case, type HistoryItem, type UserOut, type QuestionStats } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import {
  Stethoscope,
  LogOut,
  BookOpen,
  Trophy,
  BarChart3,
  Clock,
  Bot,
  ShieldAlert,
  Dna,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Microscope,
  Brain,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  
  // Randomizer State
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"randomizer" | "history">("randomizer");
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [mounted]);

  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([fetchHistory(), fetchMe(), fetchQuestionStats()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestionStats() {
    try {
      const res = await questionsApi.stats();
      setQuestionStats(res.data);
    } catch {}
  }

  const handleRecommendedCase = async () => {
    setIsRecommending(true);
    setErrorMsg("");
    try {
      const caseRes = await casesApi.getRecommended();
      const sessionRes = await sessionsApi.create(caseRes.data.id);
      router.push(`/case/${sessionRes.data.id}`);
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
    } catch {}
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
    setIsStarting(true);
    setErrorMsg("");
    try {
        const specsParam = selectedSpecs.length > 0 ? selectedSpecs.join(",") : undefined;
        // 1. Get a random case
        const randomRes = await casesApi.getRandom({ specialties: specsParam, difficulty: difficulty || undefined });
        const caseId = randomRes.data.id;
        
        // 2. Start session
        const sessionRes = await sessionsApi.create(caseId);
        router.push(`/case/${sessionRes.data.id}`);
        
    } catch (err: any) {
        setIsStarting(false);
        if (err.response?.status === 404) {
            setErrorMsg("Seçtiğiniz kriterlerde yeni/çözülmemiş vaka bulunamadı!");
        } else if (err.response?.status === 403) {
            setErrorMsg(err.response.data.detail || "Günlük limitinize ulaştınız.");
        } else {
            setErrorMsg("Vaka başlatılırken bir hata oluştu.");
        }
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

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4 mr-2 sm:mr-4">
            <ThemeToggle />
            {userProfile?.is_admin && (
                <Link href="/admin" className="flex items-center gap-1.5 transition-all text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
                  style={{ background: "color-mix(in srgb, var(--error) 10%, transparent)", borderColor: "var(--error)", color: "var(--error)" }}>
                    <ShieldAlert className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                </Link>
            )}
            <Link href="/histology" className="flex items-center gap-1.5 transition-all text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Microscope className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span className="hidden sm:inline">Histoloji</span>
            </Link>
            <Link href="/sinir-lezyon" className="flex items-center gap-1.5 transition-all text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Brain className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span className="hidden sm:inline">Nöroloji</span>
            </Link>
            <Link href="/questions" className="flex items-center gap-1.5 transition-all text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <GraduationCap className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span className="hidden sm:inline">Sorular</span>
              {questionStats && questionStats.total_questions > 0 && (
                <span className="hidden sm:flex items-center justify-center text-[10px] font-black rounded-full w-5 h-5 text-white" style={{ background: "var(--primary)" }}>
                  {questionStats.total_questions}
                </span>
              )}
            </Link>
            <Link href="/study-notes" className="flex items-center gap-1.5 transition-all text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span className="hidden sm:inline">Notlarım</span>
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 transition-all text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Trophy className="w-4 h-4" style={{ color: "var(--warning)" }} />
              <span className="hidden sm:inline">Sıralama</span>
            </Link>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg hover:bg-slate-500/10"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* AI Disclaimer & Limit Banner */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 flex items-center gap-3 border rounded-xl px-4 py-3 text-xs shadow-sm"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Bot className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>AI Destekli Simülasyon</span>
                  {" "}— Hasta yanıtları yapay zeka tarafından üretilmektedir. Gerçek klinik karar için kullanmayın.
              </span>
            </div>
            
            {userProfile && (
                <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-all`}
                  style={{ 
                    background: userProfile.is_admin ? "color-mix(in srgb, var(--primary) 10%, transparent)" : isLimitReached ? "color-mix(in srgb, var(--danger) 10%, transparent)" : "color-mix(in srgb, var(--success) 10%, transparent)",
                    borderColor: userProfile.is_admin ? "var(--primary)" : isLimitReached ? "var(--danger)" : "var(--success)",
                    color: userProfile.is_admin ? "var(--primary)" : isLimitReached ? "var(--danger)" : "var(--success)"
                  }}>
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    {userProfile.is_admin ? (
                        <span>Sınırsız Vaka Hakkı (Admin)</span>
                    ) : (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span>Kalan Vaka Hakkı: {Math.max(0, dailyLimit - todaySessions)} / {dailyLimit}</span>
                            <a href="mailto:drguevenfurkan@icloud.com?subject=KlinikIQ%20-%20Vaka%20Limiti%20Art%C4%B1r%C4%B1m%C4%B1" 
                              className="px-3 py-1.5 flex items-center justify-center rounded-lg text-xs font-bold transition-transform active:scale-95 border"
                              style={{ background: "var(--bg)", borderColor: "inherit", color: "inherit" }}>
                                Limiti Artır
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass rounded-2xl p-4 sm:p-5 border card-hover shadow-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "var(--primary)" }} />
              </div>
              <span className="text-xs hidden sm:block font-medium" style={{ color: "var(--text-muted)" }}>Toplam Vaka</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text)" }}>{uniqueTotalCount}</p>
            <p className="text-xs sm:hidden mt-1" style={{ color: "var(--text-muted)" }}>Eşsiz Vaka</p>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5 border card-hover shadow-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)" }}>
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" style={{ color: "var(--success)" }} />
              </div>
              <span className="text-xs hidden sm:block font-medium" style={{ color: "var(--text-muted)" }}>Ortalama Skor</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text)" }}>
              {avgScore != null ? avgScore : "—"}
              {avgScore != null && <span className="text-sm sm:text-lg" style={{ color: "var(--text-muted)" }}>/100</span>}
            </p>
            <p className="text-xs sm:hidden mt-1" style={{ color: "var(--text-muted)" }}>Ort. (En Yüksek)</p>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5 border card-hover shadow-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-xs hidden sm:block font-medium" style={{ color: "var(--text-muted)" }}>Tamamlanan</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text)" }}>
              {uniqueCompletedCount}
            </p>
            <p className="text-xs sm:hidden mt-1" style={{ color: "var(--text-muted)" }}>Eşsiz Tamam.</p>
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
                    <div className="glass rounded-3xl p-6 sm:p-10 border shadow-xl relative overflow-hidden" 
                      style={{ borderColor: "var(--border)" }}>
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all" 
                          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
                        
                        <div className="mb-10 relative">
                            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 mb-3" style={{ color: "var(--text)" }}>
                                <Dna className="w-7 h-7" style={{ color: "var(--primary)" }} />
                                USMLE Vaka Oluşturucu
                            </h2>
                            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                Seçtiğiniz branşlardan, daha önce karşılaşmadığınız <b style={{ color: "var(--text)" }}>tamamen benzersiz</b> bir TUS/USMLE vakası oluşturun. Zihinleri zorlamaya hazırlanın!
                            </p>
                        </div>
                        
                        <div className="mb-8">
                            <label className="block text-sm font-bold uppercase tracking-widest mb-4 px-1" style={{ color: "var(--text-muted)" }}>İlgi Alanları (Çoklu Seçilebilir)</label>
                            <div className="flex flex-wrap gap-2.5">
                                <button
                                    onClick={() => setSelectedSpecs([])}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border shadow-sm ${
                                        selectedSpecs.length === 0 
                                            ? "" 
                                            : "hover:border-slate-400"
                                    }`}
                                    style={{ 
                                      background: selectedSpecs.length === 0 ? "var(--primary)" : "var(--surface)", 
                                      borderColor: selectedSpecs.length === 0 ? "var(--primary)" : "var(--border)",
                                      color: selectedSpecs.length === 0 ? "#fff" : "var(--text-muted)"
                                    }}
                                >
                                    Tüm Sistemler (Karışık)
                                </button>
                                {SPECIALTIES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => toggleSpecialty(s.value)}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2 shadow-sm ${
                                            selectedSpecs.includes(s.value)
                                                ? "" 
                                                : "hover:border-slate-400"
                                        }`}
                                        style={{ 
                                          background: selectedSpecs.includes(s.value) ? "var(--accent)" : "var(--surface)", 
                                          borderColor: selectedSpecs.includes(s.value) ? "var(--accent)" : "var(--border)",
                                          color: selectedSpecs.includes(s.value) ? "var(--primary)" : "var(--text-muted)"
                                        }}
                                    >
                                        {s.label}
                                        {selectedSpecs.includes(s.value) && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-10">
                            <label className="block text-sm font-bold uppercase tracking-widest mb-4 px-1" style={{ color: "var(--text-muted)" }}>Zorluk Seviyesi</label>
                            <div className="flex gap-2 p-1.5 rounded-2xl border shadow-inner w-fit" 
                              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                                {DIFFICULTIES.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
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
                            <div className="mb-8 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border animate-in slide-in-from-bottom-2"
                              style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", borderColor: "var(--danger)", color: "var(--danger)" }}>
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {errorMsg}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleStartRandomCase}
                            disabled={isStarting || isRecommending}
                            className={`flex-1 py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-lg active:scale-[0.98] ${
                              isStarting || isLimitReached ? "cursor-not-allowed opacity-50" : ""
                            }`}
                            style={{ background: isStarting || isLimitReached ? "var(--text-muted)" : "var(--primary)" }}
                          >
                            <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-500 ease-out" />
                            {isStarting ? (
                              <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Hazırlanıyor...
                              </>
                            ) : (
                              <>
                                <Play className="w-5 h-5 fill-current" />
                                {isLimitReached ? "Günlük Limitinize Ulaştınız" : "Rastgele Vakayı Başlat"}
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleRecommendedCase}
                            disabled={isStarting || isRecommending || isLimitReached}
                            title="Geçmiş skorlarına göre en zayıf olduğun branştan vaka önerir"
                            className={`sm:w-auto px-6 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all border shadow-md active:scale-[0.98] ${
                              isRecommending || isLimitReached ? "cursor-not-allowed opacity-50" : "hover:shadow-lg"
                            }`}
                            style={{ background: "var(--surface)", borderColor: "var(--primary)", color: "var(--primary)" }}
                          >
                            {isRecommending ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <Sparkles className="w-5 h-5" />
                            )}
                            Önerilen Vaka
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
                <p className="text-lg font-medium opacity-60">Henüz hiç vaka çalışmadın. Hemen başla!</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.session_id}
                  className="glass rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover shadow-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex-1">
                    <p className="font-bold text-lg mb-1" style={{ color: "var(--text)" }}>{item.case_title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      <span className="px-2 py-0.5 rounded bg-slate-500/10" style={{ background: "var(--surface-2)" }}>{item.specialty}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-500/10" style={{ background: "var(--surface-2)" }}>{item.difficulty}</span>
                      <span className="opacity-60">{new Date(item.started_at).toLocaleDateString("tr-TR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-l sm:border-l-0 sm:pl-0 pl-4 transition-all" style={{ borderColor: "var(--border)" }}>
                    {item.score != null && (
                      <div className="text-xl font-black" style={{ 
                        color: item.score >= 70 ? "var(--success)" : item.score >= 50 ? "var(--warning)" : "var(--danger)" 
                      }}>
                        {item.score}/100
                      </div>
                    )}
                    {item.status === "completed" && (
                      <button
                        onClick={() => router.push(`/report/${item.session_id}`)}
                        className="text-xs font-bold border px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                        style={{ background: "var(--bg)", borderColor: "var(--primary)", color: "var(--primary)" }}
                      >
                        Raporu Gör
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
    </div>
  );
}
