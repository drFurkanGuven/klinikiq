"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  questionsApi,
  practiceMcqApi,
  type PracticeMcqAllItem,
  type Question,
  type QuestionStats,
} from "@/lib/api";
import {
  buildStatsFromQuestions,
  getAllQuestions,
  getLocalVersion,
  getRandom as getPracticeMcqRandom,
  saveAll,
} from "@/hooks/usePracticeMcqStore";
import { isAuthenticated } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Stethoscope,
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  XCircle,
  ChevronRight,
  BarChart3,
  Flame,
  Target,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const OPTION_KEYS = ["a", "b", "c", "d", "e"] as const;
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D", e: "E" };

/** Practice endpoint sırayı keser; veritabanındaki tüm sorular tek turda yüklensin. */
const PRACTICE_LIMIT = 500;

const SPECIALTIES: Record<string, string> = {
  cardiology: "Kardiyoloji",
  endocrinology: "Endokrinoloji",
  neurology: "Nöroloji",
  pulmonology: "Pnömoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  infectious_disease: "Enfeksiyon",
  hematology: "Hematoloji",
  rheumatology: "Romatoloji",
};

const USMLE_SPECIALTIES: Record<string, string> = {
  cardiology: "Kardiyoloji",
  pulmonology: "Pnömoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  neurology: "Nöroloji",
  endocrinology: "Endokrinoloji",
  hematology: "Hematoloji",
  infectious_disease: "Enfeksiyon",
  psychiatry: "Psikiyatri",
  rheumatology: "Romatoloji",
  obstetrics: "Obstetri",
  pediatrics: "Pediatri",
  oncology: "Onkoloji",
  other: "Diğer",
};

type BankTab = "case" | "usmle";

type UsmleQ = {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  source: string;
  meta_info: string;
  specialty: string;
};

function toUsmleQ(row: PracticeMcqAllItem): UsmleQ {
  return {
    id: row.id,
    question: row.question,
    options: row.options,
    source: "medqa_usmle",
    meta_info: row.meta_info,
    specialty: row.specialty,
  };
}

export default function QuestionsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<{
    is_correct: boolean;
    correct_option: string;
    explanation: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("");
  const [mode, setMode] = useState<"practice" | "all">("practice");

  const [bankTab, setBankTab] = useState<BankTab>("case");

  const [usmleStats, setUsmleStats] = useState<{
    total: number;
    by_specialty: Record<string, number>;
    by_step: Record<string, number>;
  } | null>(null);
  const [usmleQuestion, setUsmleQuestion] = useState<UsmleQ | null>(null);
  const [usmleSelected, setUsmleSelected] = useState<string | null>(null);
  const [usmleResult, setUsmleResult] = useState<{
    correct: boolean;
    correct_label: string;
    correct_answer_text: string;
  } | null>(null);
  const [usmleSessionScore, setUsmleSessionScore] = useState({
    correct: 0,
    wrong: 0,
  });
  const [usmleSpecialty, setUsmleSpecialty] = useState("");
  const [usmleStep, setUsmleStep] = useState("");
  const [usmleLoading, setUsmleLoading] = useState(false);
  const [usmleDownloading, setUsmleDownloading] = useState(false);
  const [usmleDownloadTotal, setUsmleDownloadTotal] = useState(0);
  const [usmleError, setUsmleError] = useState("");

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
    loadData();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadQuestions();
  }, [filterSpecialty, mode, mounted]);

  useEffect(() => {
    if (!mounted || bankTab !== "usmle") return;
    let cancelled = false;
    (async () => {
      if (typeof indexedDB === "undefined") {
        setUsmleError("Bu tarayıcı IndexedDB desteklemiyor.");
        return;
      }
      setUsmleLoading(true);
      setUsmleError("");
      try {
        const remote = (await practiceMcqApi.catalogVersion()).data;
        if (cancelled) return;

        const local = await getLocalVersion();
        const needsDownload =
          !local ||
          local.version !== remote.version ||
          local.total !== remote.total;

        let questionsForStats: PracticeMcqAllItem[] | null = null;

        if (needsDownload) {
          setUsmleDownloading(true);
          setUsmleDownloadTotal(remote.total);
          const allRes = await practiceMcqApi.catalogAll();
          if (cancelled) return;
          await saveAll(allRes.data.questions, allRes.data.version);
          questionsForStats = allRes.data.questions;
          setUsmleDownloading(false);
        }

        let qs = questionsForStats;
        if (!qs) {
          qs = await getAllQuestions();
        }
        if (cancelled) return;

        if (qs.length === 0) {
          setUsmleStats(null);
          setUsmleQuestion(null);
          setUsmleError("Yerel soru havuzu boş. İndirmeyi tekrar deneyin.");
          setUsmleSelected(null);
          setUsmleResult(null);
          return;
        }

        setUsmleStats(buildStatsFromQuestions(qs));

        const row = await getPracticeMcqRandom({
          specialty: usmleStep === "step1" ? "" : usmleSpecialty,
          step: usmleStep,
        });
        if (cancelled) return;

        if (!row) {
          setUsmleQuestion(null);
          setUsmleError("Filtreye uyan soru yok.");
        } else {
          setUsmleQuestion(toUsmleQ(row));
          setUsmleError("");
        }
        setUsmleSelected(null);
        setUsmleResult(null);
      } catch {
        if (!cancelled) {
          setUsmleQuestion(null);
          setUsmleStats(null);
          setUsmleDownloading(false);
          setUsmleError(
            "USMLE verisi hazırlanamadı. Bağlantıyı veya sunucuyu kontrol edin."
          );
        }
      } finally {
        if (!cancelled) setUsmleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, bankTab, usmleSpecialty, usmleStep]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadStats(), loadQuestions()]);
    setLoading(false);
  }

  async function loadStats() {
    try {
      const res = await questionsApi.stats();
      setStats(res.data);
    } catch {
      /* ignore */
    }
  }

  async function loadQuestions() {
    try {
      const params = {
        specialty: filterSpecialty || undefined,
        limit: mode === "practice" ? PRACTICE_LIMIT : undefined,
      };
      const res =
        mode === "practice"
          ? await questionsApi.practice(params)
          : await questionsApi.list({ specialty: filterSpecialty || undefined });
      setQuestions(res.data);
      setIdx(0);
      setSelectedOption(null);
      setResult(null);
      setErrorMsg("");
    } catch (err) {
      console.error("Soru yükleme hatası:", err);
      setErrorMsg(
        "Sorular yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin."
      );
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

  async function handleUsmleAnswer(label: string) {
    if (!usmleQuestion || usmleResult || usmleLoading) return;
    setUsmleSelected(label);
    try {
      setUsmleError("");
      const res = await practiceMcqApi.verify(usmleQuestion.id, label);
      setUsmleResult(res.data);
      setUsmleSessionScore((s) => ({
        correct: s.correct + (res.data.correct ? 1 : 0),
        wrong: s.wrong + (res.data.correct ? 0 : 1),
      }));
    } catch {
      setUsmleError("Yanıt doğrulanamadı. Tekrar deneyin.");
    }
  }

  function handleUsmleStepChange(next: string) {
    setUsmleStep((prev) => {
      if (
        (prev === "step1" && next === "step2&3") ||
        (prev === "step2&3" && next === "step1")
      ) {
        setUsmleSpecialty("");
      }
      return next;
    });
  }

  async function loadNextUsmle() {
    setUsmleError("");
    try {
      const row = await getPracticeMcqRandom({
        specialty: usmleStep === "step1" ? "" : usmleSpecialty,
        step: usmleStep,
      });
      if (!row) {
        setUsmleError("Filtreye uyan soru yok.");
        setUsmleQuestion(null);
      } else {
        setUsmleQuestion(toUsmleQ(row));
      }
      setUsmleSelected(null);
      setUsmleResult(null);
    } catch {
      setUsmleError("Yeni soru seçilemedi.");
      setUsmleQuestion(null);
    }
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
        background:
          selectedOption === upper
            ? "color-mix(in srgb, var(--primary) 15%, transparent)"
            : "var(--surface-2)",
        borderColor:
          selectedOption === upper ? "var(--primary)" : "var(--border)",
        color: "var(--text)",
      };
    }
    if (upper === result.correct_option) {
      return {
        background: "color-mix(in srgb, var(--success) 12%, transparent)",
        borderColor: "var(--success)",
        color: "var(--text)",
      };
    }
    if (upper === selectedOption) {
      return {
        background: "color-mix(in srgb, var(--danger) 12%, transparent)",
        borderColor: "var(--danger)",
        color: "var(--text)",
      };
    }
    return {
      background: "var(--surface-2)",
      borderColor: "var(--border)",
      color: "var(--text-muted)",
    };
  }

  function getUsmleOptionStyle(label: string) {
    const upper = label.trim().toUpperCase();
    if (!usmleResult) {
      return {
        background:
          usmleSelected === upper
            ? "color-mix(in srgb, var(--primary) 15%, transparent)"
            : "var(--surface-2)",
        borderColor:
          usmleSelected === upper ? "var(--primary)" : "var(--border)",
        color: "var(--text)",
      };
    }
    if (upper === usmleResult.correct_label) {
      return {
        background: "color-mix(in srgb, var(--success) 12%, transparent)",
        borderColor: "var(--success)",
        color: "var(--text)",
      };
    }
    if (upper === usmleSelected) {
      return {
        background: "color-mix(in srgb, var(--danger) 12%, transparent)",
        borderColor: "var(--danger)",
        color: "var(--text)",
      };
    }
    return {
      background: "var(--surface-2)",
      borderColor: "var(--border)",
      color: "var(--text-muted)",
    };
  }

  const correctRate = stats ? Math.round((stats.correct_rate || 0) * 100) : 0;

  const topUsmleSpecs =
    usmleStats &&
    Object.entries(usmleStats.by_specialty)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

  const showUsmleSticky =
    bankTab === "usmle" &&
    (usmleSessionScore.correct > 0 || usmleSessionScore.wrong > 0);

  const usmlePct =
    usmleSessionScore.correct + usmleSessionScore.wrong > 0
      ? Math.round(
          (usmleSessionScore.correct /
            (usmleSessionScore.correct + usmleSessionScore.wrong)) *
            100
        )
      : 0;

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        paddingBottom: showUsmleSticky ? "5rem" : undefined,
      }}
    >
      <div style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} />

      {/* Navbar */}
      <nav
        className="glass border-b sticky top-0 z-50"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg transition-colors hover:bg-slate-500/10 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--primary)" }}
              >
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-lg truncate"
                style={{ color: "var(--text)" }}
              >
                TUS Soru Bankası
              </span>
            </div>
          </div>
          {bankTab === "usmle" &&
            (usmleSessionScore.correct > 0 ||
              usmleSessionScore.wrong > 0) && (
              <div
                className="hidden sm:flex items-center gap-2 text-xs font-bold shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                <span style={{ color: "var(--success)" }}>
                  ✓ {usmleSessionScore.correct}
                </span>
                <span style={{ color: "var(--danger)" }}>
                  ✗ {usmleSessionScore.wrong}
                </span>
              </div>
            )}
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Bank sekmeleri */}
        <div
          className="flex gap-1 p-1 rounded-2xl border w-full sm:w-fit"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setBankTab("case")}
            className="flex-1 sm:flex-none text-center rounded-xl px-5 py-2 text-sm transition-opacity hover:opacity-80"
            style={{
              background: bankTab === "case" ? "var(--primary)" : "transparent",
              color:
                bankTab === "case" ? "white" : "var(--text-muted)",
              fontWeight: bankTab === "case" ? 700 : 600,
            }}
          >
            Vaka Soruları
          </button>
          <button
            type="button"
            onClick={() => {
              setUsmleSessionScore({ correct: 0, wrong: 0 });
              setUsmleSelected(null);
              setUsmleResult(null);
              setUsmleSpecialty("");
              setUsmleStep("");
              setUsmleError("");
              setBankTab("usmle");
            }}
            className="flex-1 sm:flex-none text-center rounded-xl px-5 py-2 text-sm transition-opacity hover:opacity-80"
            style={{
              background: bankTab === "usmle" ? "var(--primary)" : "transparent",
              color:
                bankTab === "usmle" ? "white" : "var(--text-muted)",
              fontWeight: bankTab === "usmle" ? 700 : 600,
            }}
          >
            USMLE Bankası
          </button>
        </div>

        {bankTab === "case" && (
          <>
            {/* İstatistik Kartları */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    icon: GraduationCap,
                    label: "Toplam Soru",
                    value: stats.total_questions,
                    color: "var(--primary)",
                  },
                  {
                    icon: Target,
                    label: "Cevaplanan",
                    value: stats.attempted,
                    color: "var(--accent)",
                  },
                  {
                    icon: CheckCircle2,
                    label: "Doğru",
                    value: stats.correct,
                    color: "var(--success)",
                  },
                  {
                    icon: Flame,
                    label: "Başarı",
                    value: `%${correctRate}`,
                    color:
                      stats.correct_rate >= 0.7
                        ? "var(--success)"
                        : stats.correct_rate >= 0.5
                          ? "var(--warning)"
                          : "var(--danger)",
                  },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="glass rounded-2xl p-4 border text-center shadow-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <Icon
                      className="w-5 h-5 mx-auto mb-2"
                      style={{ color }}
                    />
                    <p
                      className="text-2xl font-black"
                      style={{ color: "var(--text)" }}
                    >
                      {value}
                    </p>
                    <p
                      className="text-xs font-medium mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Filtreler */}
            <div className="flex flex-col gap-3">
              <div
                className="flex gap-1 p-1 rounded-xl border shadow-inner w-fit max-w-full overflow-x-auto"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                }}
              >
                {(["practice", "all"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
                    style={{
                      background: mode === m ? "var(--primary)" : "transparent",
                      color: mode === m ? "white" : "var(--text-muted)",
                    }}
                  >
                    {m === "practice" ? "Pratik Modu" : "Tüm Sorular"}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
                <button
                  onClick={() => setFilterSpecialty("")}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all shrink-0"
                  style={{
                    background:
                      filterSpecialty === ""
                        ? "var(--primary)"
                        : "var(--surface)",
                    borderColor:
                      filterSpecialty === ""
                        ? "var(--primary)"
                        : "var(--border)",
                    color:
                      filterSpecialty === "" ? "white" : "var(--text-muted)",
                  }}
                >
                  Tümü
                </button>
                {Object.entries(SPECIALTIES).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() =>
                      setFilterSpecialty(val === filterSpecialty ? "" : val)
                    }
                    className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all shrink-0"
                    style={{
                      background:
                        filterSpecialty === val
                          ? "var(--accent)"
                          : "var(--surface)",
                      borderColor:
                        filterSpecialty === val
                          ? "var(--accent)"
                          : "var(--border)",
                      color:
                        filterSpecialty === val
                          ? "var(--primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Boş durum */}
            {!loading && questions.length === 0 && (
              <div
                className="text-center py-24 rounded-3xl border border-dashed"
                style={{ borderColor: "var(--border)" }}
              >
                <GraduationCap
                  className="w-16 h-16 mx-auto mb-4 opacity-20"
                  style={{ color: "var(--text)" }}
                />
                <p
                  className="text-lg font-bold opacity-60"
                  style={{ color: "var(--text)" }}
                >
                  Henüz soru yok
                </p>
                <p
                  className="text-sm mt-2 opacity-40"
                  style={{ color: "var(--text-muted)" }}
                >
                  Bir vakayı tamamladığında AI otomatik olarak TUS soruları üretir.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: "var(--primary)", color: "white" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Vaka Çözmeye Git
                </Link>
              </div>
            )}

            {errorMsg && (
              <div
                className="p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border animate-pulse"
                style={{
                  background: "var(--error-light)",
                  borderColor: "var(--error-light)",
                  color: "var(--danger)",
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            {!loading && currentQ && (
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>
                    {idx + 1} / {questions.length} soru
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold border"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {SPECIALTIES[currentQ.specialty] || currentQ.specialty}
                  </span>
                </div>

                <div
                  className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-8 border shadow-md"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    className="text-base sm:text-lg font-semibold leading-relaxed mb-6 sm:mb-8"
                    style={{ color: "var(--text)" }}
                  >
                    {currentQ.question_text}
                  </p>

                  <div className="flex flex-col gap-2 sm:gap-4">
                    {OPTION_KEYS.map((key) => {
                      const upper = key.toUpperCase();
                      const text = currentQ[
                        `option_${key}` as keyof Question
                      ] as string;
                      const isCorrect =
                        result && upper === result.correct_option;
                      const isWrong =
                        result &&
                        upper === selectedOption &&
                        !result.is_correct;

                      return (
                        <button
                          key={key}
                          onClick={() => handleAnswer(upper)}
                          disabled={!!result || submitting}
                          className="w-full flex items-start gap-3 sm:gap-4 px-3 py-3 sm:px-5 sm:py-4 rounded-2xl border text-left transition-all font-medium text-sm disabled:cursor-default"
                          style={getOptionStyle(key)}
                        >
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border"
                            style={{
                              background: isCorrect
                                ? "var(--success)"
                                : isWrong
                                  ? "var(--danger)"
                                  : upper === selectedOption && !result
                                    ? "var(--primary)"
                                    : "var(--surface-2)",
                              borderColor: isCorrect
                                ? "var(--success)"
                                : isWrong
                                  ? "var(--danger)"
                                  : upper === selectedOption && !result
                                    ? "var(--primary)"
                                    : "var(--border)",
                              color:
                                isCorrect ||
                                isWrong ||
                                (upper === selectedOption && !result)
                                  ? "white"
                                  : "var(--text-muted)",
                            }}
                          >
                            {OPTION_LABELS[key]}
                          </span>
                          <span className="flex-1 pt-0.5">{text}</span>
                          {isCorrect && (
                            <CheckCircle2
                              className="w-5 h-5 flex-shrink-0 mt-0.5"
                              style={{ color: "var(--success)" }}
                            />
                          )}
                          {isWrong && (
                            <XCircle
                              className="w-5 h-5 flex-shrink-0 mt-0.5"
                              style={{ color: "var(--danger)" }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {result && (
                  <div
                    className="rounded-3xl p-6 border animate-in slide-in-from-bottom-2 duration-300"
                    style={{
                      background: result.is_correct
                        ? "color-mix(in srgb, var(--success) 8%, transparent)"
                        : "color-mix(in srgb, var(--danger) 8%, transparent)",
                      borderColor: result.is_correct
                        ? "color-mix(in srgb, var(--success) 30%, transparent)"
                        : "color-mix(in srgb, var(--danger) 30%, transparent)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {result.is_correct ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "var(--success)" }}
                        />
                      ) : (
                        <XCircle
                          className="w-5 h-5"
                          style={{ color: "var(--danger)" }}
                        />
                      )}
                      <span
                        className="font-bold text-sm"
                        style={{
                          color: result.is_correct
                            ? "var(--success)"
                            : "var(--danger)",
                        }}
                      >
                        {result.is_correct
                          ? "Doğru!"
                          : `Yanlış — Doğru cevap: ${result.correct_option}`}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {result.explanation}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap gap-1 p-1 max-w-full overflow-x-auto">
                    {questions
                      .slice(
                        Math.max(0, idx - 2),
                        Math.min(questions.length, idx + 5)
                      )
                      .map((_, i) => {
                        const realIdx = Math.max(0, idx - 2) + i;
                        const q = questions[realIdx];
                        return (
                          <button
                            key={realIdx}
                            onClick={() => {
                              setIdx(realIdx);
                              setSelectedOption(null);
                              setResult(null);
                            }}
                            className="w-8 h-8 rounded-lg text-xs font-bold border transition-all shrink-0"
                            style={{
                              background:
                                realIdx === idx
                                  ? "var(--primary)"
                                  : q.user_answered
                                    ? q.user_was_correct
                                      ? "color-mix(in srgb, var(--success) 15%, transparent)"
                                      : "color-mix(in srgb, var(--danger) 15%, transparent)"
                                    : "var(--surface-2)",
                              borderColor:
                                realIdx === idx
                                  ? "var(--primary)"
                                  : q.user_answered
                                    ? q.user_was_correct
                                      ? "color-mix(in srgb, var(--success) 40%, transparent)"
                                      : "color-mix(in srgb, var(--danger) 40%, transparent)"
                                    : "var(--border)",
                              color:
                                realIdx === idx
                                  ? "white"
                                  : "var(--text-muted)",
                            }}
                          >
                            {realIdx + 1}
                          </button>
                        );
                      })}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={loadQuestions}
                      className="p-2 rounded-xl border transition-all hover:opacity-70"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: "var(--border)",
                        color: "var(--text-muted)",
                      }}
                      title="Listeyi yenile"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={idx >= questions.length - 1}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all disabled:opacity-30"
                      style={{
                        background: "var(--primary)",
                        borderColor: "var(--primary)",
                        color: "white",
                      }}
                    >
                      Sonraki <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stats && Object.keys(stats.by_specialty).length > 0 && (
              <div
                className="glass rounded-3xl p-6 border shadow-sm"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <BarChart3
                    className="w-5 h-5"
                    style={{ color: "var(--primary)" }}
                  />
                  <h3 className="font-bold" style={{ color: "var(--text)" }}>
                    Branş Bazlı Performans
                  </h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.by_specialty).map(([spec, data]) => (
                    <div key={spec}>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span style={{ color: "var(--text)" }}>
                          {SPECIALTIES[spec] || spec}
                        </span>
                        <span
                          style={{
                            color:
                              data.rate >= 0.7
                                ? "var(--success)"
                                : data.rate >= 0.5
                                  ? "var(--warning)"
                                  : "var(--danger)",
                          }}
                        >
                          {data.correct}/{data.attempted} (%
                          {Math.round(data.rate * 100)})
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.round(data.rate * 100)}%`,
                            background:
                              data.rate >= 0.7
                                ? "var(--success)"
                                : data.rate >= 0.5
                                  ? "var(--warning)"
                                  : "var(--danger)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {bankTab === "usmle" && (
          <>
            {usmleDownloading && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: "var(--primary)",
                    borderTopColor: "transparent",
                  }}
                />
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {usmleDownloadTotal.toLocaleString("tr-TR")} soru yükleniyor
                </p>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sorular ilk kez indiriliyor...
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Bu işlem bir kez yapılır, sonraki açılışlar anında yüklenir.
                </p>
              </div>
            )}

            {!usmleDownloading && usmleStats && (
              <div
                className="glass rounded-2xl p-4 border shadow-sm"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "var(--text)" }}
                >
                  USMLE havuzu
                </p>
                <p
                  className="text-2xl font-black mb-3"
                  style={{ color: "var(--primary)" }}
                >
                  {usmleStats.total.toLocaleString("tr-TR")} soru
                </p>
                <div
                  className="flex flex-wrap gap-3 text-xs font-semibold mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>
                    Step 1:{" "}
                    <span style={{ color: "var(--text)" }}>
                      {(usmleStats.by_step["step1"] ?? 0).toLocaleString(
                        "tr-TR"
                      )}
                    </span>
                  </span>
                  <span>
                    Step 2&3:{" "}
                    <span style={{ color: "var(--text)" }}>
                      {(usmleStats.by_step["step2&3"] ?? 0).toLocaleString(
                        "tr-TR"
                      )}
                    </span>
                  </span>
                </div>
                {topUsmleSpecs && topUsmleSpecs.length > 0 && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    En çok soru:{" "}
                    {topUsmleSpecs
                      .map(
                        ([k, v]) =>
                          `${USMLE_SPECIALTIES[k] || k} (${v.toLocaleString("tr-TR")})`
                      )
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}

            {!usmleDownloading && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
                {(
                  [
                    { id: "", label: "Tümü" },
                    { id: "step1", label: "Step 1" },
                    { id: "step2&3", label: "Step 2&3" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id || "all"}
                    type="button"
                    onClick={() => handleUsmleStepChange(s.id)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all shrink-0"
                    style={{
                      background:
                        usmleStep === s.id ? "var(--primary)" : "var(--surface)",
                      borderColor:
                        usmleStep === s.id
                          ? "var(--primary)"
                          : "var(--border)",
                      color: usmleStep === s.id ? "white" : "var(--text-muted)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {usmleStep === "step1" ? (
                <div
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 8%, transparent)",
                    color: "var(--text-muted)",
                    border:
                      "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                  }}
                >
                  Step 1 soruları temel bilimleri kapsar (anatomi, fizyoloji,
                  farmakoloji, patoloji) — branş filtresi Step 2&3 için geçerlidir.
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
                  <button
                    type="button"
                    onClick={() => setUsmleSpecialty("")}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all shrink-0"
                    style={{
                      background:
                        usmleSpecialty === ""
                          ? "var(--primary)"
                          : "var(--surface)",
                      borderColor:
                        usmleSpecialty === ""
                          ? "var(--primary)"
                          : "var(--border)",
                      color:
                        usmleSpecialty === "" ? "white" : "var(--text-muted)",
                    }}
                  >
                    Tüm branşlar
                  </button>
                  {Object.entries(USMLE_SPECIALTIES).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setUsmleSpecialty(val === usmleSpecialty ? "" : val)
                      }
                      className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all shrink-0"
                      style={{
                        background:
                          usmleSpecialty === val
                            ? "var(--accent)"
                            : "var(--surface)",
                        borderColor:
                          usmleSpecialty === val
                            ? "var(--accent)"
                            : "var(--border)",
                        color:
                          usmleSpecialty === val
                            ? "var(--primary)"
                            : "var(--text-muted)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {!usmleDownloading && usmleError && (
              <div
                className="p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border"
                style={{
                  background: "var(--error-light)",
                  borderColor: "var(--error-light)",
                  color: "var(--danger)",
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {usmleError}
              </div>
            )}

            {!usmleDownloading &&
              usmleLoading &&
              !usmleQuestion &&
              !usmleError && (
              <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                Soru yükleniyor…
              </p>
            )}

            {!usmleDownloading && usmleQuestion && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute top-0 right-0 flex flex-wrap gap-1 justify-end max-w-[90%]">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                        border:
                          "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                      }}
                    >
                      USMLE{" "}
                      {usmleQuestion.meta_info === "step1"
                        ? "Step 1"
                        : "Step 2&3"}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 25%, transparent)",
                        color: "var(--accent)",
                        border:
                          "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                      }}
                    >
                      {USMLE_SPECIALTIES[usmleQuestion.specialty] ||
                        usmleQuestion.specialty}
                    </span>
                  </div>
                  <div
                    className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-8 border shadow-md pt-10 sm:pt-12"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <p
                      className="text-base sm:text-lg font-semibold leading-relaxed mb-6 sm:mb-8 pr-1"
                      style={{ color: "var(--text)" }}
                    >
                      {usmleQuestion.question}
                    </p>

                    <div className="flex flex-col gap-2 sm:gap-4">
                      {usmleQuestion.options.map((opt) => {
                        const lab = opt.label.trim().toUpperCase();
                        const isCorrect =
                          usmleResult && lab === usmleResult.correct_label;
                        const isWrong =
                          usmleResult &&
                          lab === usmleSelected &&
                          !usmleResult.correct;

                        return (
                          <button
                            key={lab}
                            type="button"
                            onClick={() => void handleUsmleAnswer(lab)}
                            disabled={!!usmleResult || usmleLoading}
                            className="w-full flex items-start gap-3 sm:gap-4 px-3 py-3 sm:px-5 sm:py-4 rounded-2xl border text-left transition-all font-medium text-sm disabled:cursor-default"
                            style={getUsmleOptionStyle(lab)}
                          >
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 border"
                              style={{
                                background: isCorrect
                                  ? "var(--success)"
                                  : isWrong
                                    ? "var(--danger)"
                                    : usmleSelected === lab && !usmleResult
                                      ? "var(--primary)"
                                      : "var(--surface-2)",
                                borderColor: isCorrect
                                  ? "var(--success)"
                                  : isWrong
                                    ? "var(--danger)"
                                    : usmleSelected === lab && !usmleResult
                                      ? "var(--primary)"
                                      : "var(--border)",
                                color:
                                  isCorrect ||
                                  isWrong ||
                                  (usmleSelected === lab && !usmleResult)
                                    ? "white"
                                    : "var(--text-muted)",
                              }}
                            >
                              {lab}
                            </span>
                            <span className="flex-1 pt-0.5">{opt.text}</span>
                            {isCorrect && (
                              <CheckCircle2
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                style={{ color: "var(--success)" }}
                              />
                            )}
                            {isWrong && (
                              <XCircle
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                style={{ color: "var(--danger)" }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {usmleResult && (
                  <div
                    className="rounded-3xl p-6 border"
                    style={{
                      background: usmleResult.correct
                        ? "color-mix(in srgb, var(--success) 8%, transparent)"
                        : "color-mix(in srgb, var(--danger) 8%, transparent)",
                      borderColor: usmleResult.correct
                        ? "color-mix(in srgb, var(--success) 30%, transparent)"
                        : "color-mix(in srgb, var(--danger) 30%, transparent)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {usmleResult.correct ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "var(--success)" }}
                        />
                      ) : (
                        <XCircle
                          className="w-5 h-5"
                          style={{ color: "var(--danger)" }}
                        />
                      )}
                      <span
                        className="font-bold text-sm"
                        style={{
                          color: usmleResult.correct
                            ? "var(--success)"
                            : "var(--danger)",
                        }}
                      >
                        {usmleResult.correct
                          ? "Doğru"
                          : `Yanlış — Doğru: ${usmleResult.correct_label}`}
                      </span>
                    </div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      Doğru cevap metni: {usmleResult.correct_answer_text}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void loadNextUsmle()}
                    disabled={usmleLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all disabled:opacity-50"
                    style={{
                      background: "var(--primary)",
                      borderColor: "var(--primary)",
                      color: "white",
                    }}
                  >
                    Sonraki soru <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showUsmleSticky && (
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-3 border-t sm:hidden"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            zIndex: 40,
          }}
        >
          <span className="text-sm font-bold" style={{ color: "var(--success)" }}>
            ✓ {usmleSessionScore.correct} Doğru
          </span>
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--danger)" }}>
            ✗ {usmleSessionScore.wrong} Yanlış
          </span>
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {usmlePct}% başarı
          </span>
        </div>
      )}
    </div>
  );
}
