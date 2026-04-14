"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { questionsApi, type Question, type QuestionStats } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Stethoscope, ArrowLeft, GraduationCap, CheckCircle2, XCircle,
  ChevronRight, BarChart3, Flame, Target, RefreshCw, AlertCircle,
} from "lucide-react";

const OPTION_KEYS = ["a", "b", "c", "d", "e"] as const;
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D", e: "E" };

const SPECIALTIES: Record<string, string> = {
  cardiology: "Kardiyoloji",
  endocrinology: "Endokrinoloji",
  neurology: "Nöroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  infectious_disease: "Enfeksiyon",
  hematology: "Hematoloji",
  rheumatology: "Romatoloji",
};

export default function QuestionsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<{ is_correct: boolean; correct_option: string; explanation: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("");
  const [mode, setMode] = useState<"practice" | "all">("practice");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) { router.replace("/login"); return; }
    loadData();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadQuestions();
  }, [filterSpecialty, mode, mounted]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadStats(), loadQuestions()]);
    setLoading(false);
  }

  async function loadStats() {
    try {
      const res = await questionsApi.stats();
      setStats(res.data);
    } catch {}
  }

  async function loadQuestions() {
    try {
      const params = { specialty: filterSpecialty || undefined, limit: 50 };
      const res = mode === "practice"
        ? await questionsApi.practice(params)
        : await questionsApi.list({ specialty: filterSpecialty || undefined });
      setQuestions(res.data);
      setIdx(0);
      setSelectedOption(null);
      setResult(null);
      setErrorMsg("");
    } catch (err) {
      console.error("Soru yükleme hatası:", err);
      setErrorMsg("Sorular yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin.");
      setQuestions([]);
    }
  }

  const currentQ = questions[idx];

  async function handleAnswer(option: string) {
    if (result || submitting || !currentQ) return;
    setSelectedOption(option);
    setSubmitting(true);
    try {
      const res = await questionsApi.answer(currentQ.id, option);
      setResult(res.data);
      await loadStats();
      setErrorMsg("");
    } catch (err) {
      console.error("Cevap gönderme hatası:", err);
      setErrorMsg("Cevap iletilemedi. Lütfen tekrar deneyin.");
    }
    setSubmitting(false);
  }

  function handleNext() {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setSelectedOption(null);
      setResult(null);
    }
  }

  function getOptionStyle(key: string) {
    const upper = key.toUpperCase();
    if (!result) {
      return {
        background: selectedOption === upper ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--surface-2)",
        borderColor: selectedOption === upper ? "var(--primary)" : "var(--border)",
        color: "var(--text)",
      };
    }
    if (upper === result.correct_option) {
      return { background: "color-mix(in srgb, var(--success) 12%, transparent)", borderColor: "var(--success)", color: "var(--text)" };
    }
    if (upper === selectedOption) {
      return { background: "color-mix(in srgb, var(--danger) 12%, transparent)", borderColor: "var(--danger)", color: "var(--text)" };
    }
    return { background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" };
  }

  const correctRate = stats ? Math.round((stats.correct_rate || 0) * 100) : 0;

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="glass border-b sticky top-0 z-50" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg transition-colors hover:bg-slate-500/10" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)" }}>
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg" style={{ color: "var(--text)" }}>TUS Soru Bankası</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">

        {/* İstatistik Kartları */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: GraduationCap, label: "Toplam Soru", value: stats.total_questions, color: "var(--primary)" },
              { icon: Target, label: "Cevaplanan", value: stats.attempted, color: "#8b5cf6" },
              { icon: CheckCircle2, label: "Doğru", value: stats.correct, color: "var(--success)" },
              { icon: Flame, label: "Başarı", value: `%${correctRate}`, color: stats.correct_rate >= 0.7 ? "var(--success)" : stats.correct_rate >= 0.5 ? "var(--warning)" : "var(--danger)" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass rounded-2xl p-4 border text-center shadow-sm" style={{ borderColor: "var(--border)" }}>
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
                <p className="text-2xl font-black" style={{ color: "var(--text)" }}>{value}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 rounded-xl border shadow-inner w-fit" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
            {(["practice", "all"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: mode === m ? "var(--primary)" : "transparent", color: mode === m ? "#fff" : "var(--text-muted)" }}>
                {m === "practice" ? "Pratik Modu" : "Tüm Sorular"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterSpecialty("")}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={{ background: filterSpecialty === "" ? "var(--primary)" : "var(--surface)", borderColor: filterSpecialty === "" ? "var(--primary)" : "var(--border)", color: filterSpecialty === "" ? "#fff" : "var(--text-muted)" }}>
              Tümü
            </button>
            {Object.entries(SPECIALTIES).map(([val, label]) => (
              <button key={val} onClick={() => setFilterSpecialty(val === filterSpecialty ? "" : val)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={{ background: filterSpecialty === val ? "var(--accent)" : "var(--surface)", borderColor: filterSpecialty === val ? "var(--accent)" : "var(--border)", color: filterSpecialty === val ? "var(--primary)" : "var(--text-muted)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Boş durum */}
        {!loading && questions.length === 0 && (
          <div className="text-center py-24 rounded-3xl border border-dashed" style={{ borderColor: "var(--border)" }}>
            <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: "var(--text)" }} />
            <p className="text-lg font-bold opacity-60" style={{ color: "var(--text)" }}>Henüz soru yok</p>
            <p className="text-sm mt-2 opacity-40" style={{ color: "var(--text-muted)" }}>
              Bir vakayı tamamladığında AI otomatik olarak TUS soruları üretir.
            </p>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
              style={{ background: "var(--primary)" }}>
              <ArrowLeft className="w-4 h-4" /> Vaka Çözmeye Git
            </Link>
          </div>
        )}
        
        {/* Hata Mesajı */}
        {errorMsg && (
          <div className="p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border animate-pulse"
            style={{ background: "var(--error-light)", borderColor: "var(--error-light)", color: "var(--danger)" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Soru Kartı */}
        {!loading && currentQ && (
          <div className="space-y-4">
            {/* İlerleme */}
            <div className="flex items-center justify-between text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              <span>{idx + 1} / {questions.length} soru</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                {SPECIALTIES[currentQ.specialty] || currentQ.specialty}
              </span>
            </div>

            {/* Soru */}
            <div className="glass rounded-3xl p-8 border shadow-md" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <p className="text-base sm:text-lg font-semibold leading-relaxed mb-8" style={{ color: "var(--text)" }}>
                {currentQ.question_text}
              </p>

              <div className="space-y-3">
                {OPTION_KEYS.map((key) => {
                  const upper = key.toUpperCase();
                  const text = currentQ[`option_${key}` as keyof Question] as string;
                  const isCorrect = result && upper === result.correct_option;
                  const isWrong = result && upper === selectedOption && !result.is_correct;

                  return (
                    <button key={key} onClick={() => handleAnswer(upper)}
                      disabled={!!result || submitting}
                      className="w-full flex items-start gap-4 px-5 py-4 rounded-2xl border text-left transition-all font-medium text-sm disabled:cursor-default"
                      style={getOptionStyle(key)}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border"
                        style={{
                          background: isCorrect ? "var(--success)" : isWrong ? "var(--danger)" : upper === selectedOption && !result ? "var(--primary)" : "var(--surface-2)",
                          borderColor: isCorrect ? "var(--success)" : isWrong ? "var(--danger)" : upper === selectedOption && !result ? "var(--primary)" : "var(--border)",
                          color: (isCorrect || isWrong || (upper === selectedOption && !result)) ? "#fff" : "var(--text-muted)",
                        }}>
                        {OPTION_LABELS[key]}
                      </span>
                      <span className="flex-1 pt-0.5">{text}</span>
                      {isCorrect && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />}
                      {isWrong && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sonuç & Açıklama */}
            {result && (
              <div className="rounded-3xl p-6 border animate-in slide-in-from-bottom-2 duration-300"
                style={{
                  background: result.is_correct ? "color-mix(in srgb, var(--success) 8%, transparent)" : "color-mix(in srgb, var(--danger) 8%, transparent)",
                  borderColor: result.is_correct ? "color-mix(in srgb, var(--success) 30%, transparent)" : "color-mix(in srgb, var(--danger) 30%, transparent)",
                }}>
                <div className="flex items-center gap-2 mb-3">
                  {result.is_correct
                    ? <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
                    : <XCircle className="w-5 h-5" style={{ color: "var(--danger)" }} />}
                  <span className="font-bold text-sm" style={{ color: result.is_correct ? "var(--success)" : "var(--danger)" }}>
                    {result.is_correct ? "Doğru!" : `Yanlış — Doğru cevap: ${result.correct_option}`}
                  </span>
                </div>
                <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--text)" }}>
                  {result.explanation}
                </p>
              </div>
            )}

            {/* Navigasyon */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {questions.slice(Math.max(0, idx - 2), Math.min(questions.length, idx + 5)).map((_, i) => {
                  const realIdx = Math.max(0, idx - 2) + i;
                  const q = questions[realIdx];
                  return (
                    <button key={realIdx} onClick={() => { setIdx(realIdx); setSelectedOption(null); setResult(null); }}
                      className="w-8 h-8 rounded-lg text-xs font-bold border transition-all"
                      style={{
                        background: realIdx === idx ? "var(--primary)" : q.user_answered ? (q.user_was_correct ? "color-mix(in srgb, var(--success) 15%, transparent)" : "color-mix(in srgb, var(--danger) 15%, transparent)") : "var(--surface-2)",
                        borderColor: realIdx === idx ? "var(--primary)" : q.user_answered ? (q.user_was_correct ? "color-mix(in srgb, var(--success) 40%, transparent)" : "color-mix(in srgb, var(--danger) 40%, transparent)") : "var(--border)",
                        color: realIdx === idx ? "#fff" : "var(--text-muted)",
                      }}>
                      {realIdx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button onClick={loadQuestions}
                  className="p-2 rounded-xl border transition-all hover:opacity-70"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                  title="Listeyi yenile">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={handleNext}
                  disabled={idx >= questions.length - 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all disabled:opacity-30"
                  style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }}>
                  Sonraki <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Branş Bazlı İstatistik */}
        {stats && Object.keys(stats.by_specialty).length > 0 && (
          <div className="glass rounded-3xl p-6 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3 mb-5">
              <BarChart3 className="w-5 h-5" style={{ color: "var(--primary)" }} />
              <h3 className="font-bold" style={{ color: "var(--text)" }}>Branş Bazlı Performans</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.by_specialty).map(([spec, data]) => (
                <div key={spec}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span style={{ color: "var(--text)" }}>{SPECIALTIES[spec] || spec}</span>
                    <span style={{ color: data.rate >= 0.7 ? "var(--success)" : data.rate >= 0.5 ? "var(--warning)" : "var(--danger)" }}>
                      {data.correct}/{data.attempted} (%{Math.round(data.rate * 100)})
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.round(data.rate * 100)}%`,
                        background: data.rate >= 0.7 ? "var(--success)" : data.rate >= 0.5 ? "var(--warning)" : "var(--danger)",
                      }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
