"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { casesApi, usersApi, authApi, sessionsApi, type Case, type HistoryItem, type UserOut } from "@/lib/api";
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
  AlertCircle
} from "lucide-react";

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

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchHistory(), fetchMe()]);
    setLoading(false);
  }
  
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
      <nav className="glass border-b sticky top-0 z-50" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary)" }}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: "var(--text)" }}>KlinikIQ</span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-6 mr-2 sm:mr-4">
            {userProfile?.is_admin && (
                <Link href="/admin" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium bg-red-900/30 hover:bg-red-900/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-900/50">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span className="hidden sm:inline">Yönetim Paneli</span>
                </Link>
            )}
            <Link href="/study-notes" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium bg-slate-800/30 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-700">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Hata Defterim</span>
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium bg-slate-800/30 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-700">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="hidden sm:inline">Liderlik</span>
            </Link>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* AI Disclaimer & Limit Banner */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 flex items-center gap-3 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3 text-xs text-slate-400">
            <Bot className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>
                <span className="text-blue-400 font-medium">AI Destekli Simülasyon</span>
                {" "}— Hasta yanıtları yapay zeka tarafından üretilmektedir. Gerçek klinik karar için kullanmayın.
            </span>
            </div>
            
            {userProfile && (
                <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm font-medium ${userProfile.is_admin ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : isLimitReached ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    {userProfile.is_admin ? (
                        <span>Sınırsız Vaka Hakkı (Admin)</span>
                    ) : (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span>Kalan Vaka Hakkı: {Math.max(0, dailyLimit - todaySessions)} / {dailyLimit}</span>
                            <a href="mailto:drguevenfurkan@icloud.com?subject=KlinikIQ%20-%20Vaka%20Limiti%20Art%C4%B1r%C4%B1m%C4%B1" className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 flex items-center justify-center rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-emerald-500/30">
                                Limiti Artır
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass rounded-2xl p-4 sm:p-5 border border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Toplam Vaka</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{uniqueTotalCount}</p>
            <p className="text-xs text-slate-500 sm:hidden mt-1">Eşsiz Vaka</p>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5 border border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Ortalama Skor</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {avgScore != null ? avgScore : "—"}
              {avgScore != null && <span className="text-sm sm:text-lg text-slate-400">/100</span>}
            </p>
            <p className="text-xs text-slate-500 sm:hidden mt-1">Ort. (En Yüksek)</p>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5 border border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Tamamlanan</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {uniqueCompletedCount}
            </p>
            <p className="text-xs text-slate-500 sm:hidden mt-1">Eşsiz Tamam.</p>
          </div>
        </div>

        {/* Tab navigasyon */}
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl w-fit mb-6">
          {(["randomizer", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "randomizer" ? "Yepyeni Vaka Çöz" : "Geçmişim"}
            </button>
          ))}
        </div>

        {activeTab === "randomizer" && (
            <div className="grid grid-cols-1 gap-6">
                <div className="md:col-span-12">
                    <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="mb-8 relative">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                                <Dna className="w-6 h-6 text-blue-400" />
                                USMLE Vaka Oluşturucu
                            </h2>
                            <p className="text-slate-400 text-sm">
                                Seçtiğiniz branşlardan, daha önce karşılaşmadığınız <b className="text-white">tamamen benzersiz</b> bir TUS/USMLE vakası oluşturun. Zihinleri zorlamaya hazırlanın!
                            </p>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-3">İlgi Alanları (Çoklu Seçilebilir)</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedSpecs([])}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                                        selectedSpecs.length === 0 
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-300" 
                                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                                    }`}
                                >
                                    Tüm Sistemler (Karışık)
                                </button>
                                {SPECIALTIES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => toggleSpecialty(s.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 ${
                                            selectedSpecs.includes(s.value)
                                                ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                                                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                                        }`}
                                    >
                                        {s.label}
                                        {selectedSpecs.includes(s.value) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-medium text-slate-300 mb-3">Zorluk Seviyesi</label>
                            <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 w-fit">
                                {DIFFICULTIES.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            difficulty === d.value
                                                ? "bg-slate-700 text-white shadow-md shadow-black/20"
                                                : "text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {errorMsg}
                            </div>
                        )}

                        <button 
                            onClick={handleStartRandomCase}
                            disabled={isStarting}
                            className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all relative overflow-hidden group ${
                                isStarting || isLimitReached
                                    ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                            }`}
                        >
                            <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300 ease-out" />
                            {isStarting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Vaka Hazırlanıyor...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 fill-current" /> 
                                    {isLimitReached ? "Günlük Limitinize Ulaştınız" : "Rastgele Vakayı Başlat"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Henüz hiç vaka çalışmadın. Hemen başla!</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.session_id}
                  className="glass rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-white text-sm">{item.case_title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.specialty} • {item.difficulty} •{" "}
                      {new Date(item.started_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.score != null && (
                      <div className={`text-lg font-bold ${
                        item.score >= 70 ? "text-emerald-400" : item.score >= 50 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {item.score}/100
                      </div>
                    )}
                    {item.status === "completed" && (
                      <button
                        onClick={() => router.push(`/report/${item.session_id}`)}
                        className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors"
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
