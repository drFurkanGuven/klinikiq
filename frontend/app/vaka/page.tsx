"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { casesApi, usersApi, authApi, sessionsApi, type HistoryItem, type UserOut } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import Footer from "@/components/Footer";
import {
  Clock, Bot, Dna, Play, CheckCircle2, AlertCircle, Sparkles, Loader2, RefreshCw, Filter,
} from "lucide-react";
import { StudyNav } from "@/components/study/StudyNav";

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
import { storage } from "@/lib/storage";

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

export default function VakaPage() {
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
  const [mounted, setMounted] = useState(false);
  const [restartingSessionId, setRestartingSessionId] = useState<string | null>(null);
  const [filterSuggestion, setFilterSuggestion] = useState<{ label: string; specs: string[]; difficulty: string } | null>(null);

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
      await Promise.all([fetchHistory(), fetchMe()]);
    } finally {
      setLoading(false);
    }
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

  // Daily usage calculation
  const today = new Date().setHours(0,0,0,0);
  const todaySessions = history.filter(h => new Date(h.started_at).getTime() >= today).length;
  const dailyLimit = userProfile?.daily_limit || 3;
  const isLimitReached = !userProfile?.is_admin && todaySessions >= dailyLimit;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <StudyNav />

      <main className="relative z-0 flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Vaka simülasyonu</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>AI destekli klinik vaka çözümü</p>
        </div>

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
    </div>
  );
}
