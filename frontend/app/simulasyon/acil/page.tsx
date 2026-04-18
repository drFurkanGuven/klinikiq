"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  emergencyMcqApi,
  getBaseUrl,
  type EmergencyMcqRandom,
  type EmergencyMcqStats,
  type EmergencyMcqReportCreateItem,
} from "@/lib/api";
import { storage } from "@/lib/storage";
import {
  ArrowLeft,
  LogOut,
  Loader2,
  AlertCircle,
  Zap,
  RefreshCw,
  Bot,
  Send,
  Timer,
  HeartPulse,
  FileText,
} from "lucide-react";

/** Simüle acil süre baskısı (dakika); tam simülatörde tetkik süreleri ayrı eklenebilir */
const QUESTION_TIME_LIMIT_SEC = 8 * 60;

function fmtMmSs(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = Math.max(0, totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type AiMsg = { role: "user" | "assistant"; content: string };
type PatientUrgeLine = { phase: "120" | "60"; text: string };

/** Bu sayfa oturumunda çözülen sorular — çok soruluk rapor için */
type SessionMcqItem = EmergencyMcqReportCreateItem;

export default function AcilSimulasyonMcqPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const questionStartRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<EmergencyMcqStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [q, setQ] = useState<EmergencyMcqRandom | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; correct_label: string | null; correct_answer_text: string | null } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  /** 1 sn'de bir yenileme (süre göstergesi) */
  const [timerTick, setTimerTick] = useState(0);
  /** Şık işaretlenince dondurulan süre (saniye) */
  const [frozenElapsedSec, setFrozenElapsedSec] = useState<number | null>(null);
  /** Süre azalınca otomatik hasta çıkışları (AI) */
  const [patientUrges, setPatientUrges] = useState<PatientUrgeLine[]>([]);
  const prevRemRef = useRef<number | null>(null);
  const urgeSentRef = useRef({ p120: false, p60: false });
  /** Yeni soruya geçerken AI sohbeti buraya eklenir; raporda tüm oturum kullanılır */
  const [sessionAiTranscript, setSessionAiTranscript] = useState<AiMsg[]>([]);
  const [sessionItems, setSessionItems] = useState<SessionMcqItem[]>([]);
  const [sessionPatientUrges, setSessionPatientUrges] = useState<string[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/simulasyon/acil");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    void (async () => {
      try {
        const res = await emergencyMcqApi.stats();
        setStats(res.data);
        setStatsError(null);
      } catch (e: unknown) {
        const d = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setStatsError(typeof d === "string" ? d : "Veri dosyası bulunamadı veya sunucu yapılandırması eksik.");
      }
    })();
  }, [mounted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiStreaming]);

  useEffect(() => {
    setAiMessages([]);
    setAiInput("");
    setFrozenElapsedSec(null);
    setPatientUrges([]);
    prevRemRef.current = null;
    urgeSentRef.current = { p120: false, p60: false };
    if (q?.id) {
      questionStartRef.current = Date.now();
    } else {
      questionStartRef.current = null;
    }
  }, [q?.id]);

  useEffect(() => {
    if (!q?.id || result) return;
    const id = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [q?.id, result]);

  function clearSessionProgress() {
    setSessionItems([]);
    setSessionAiTranscript([]);
    setSessionPatientUrges([]);
    setReportError(null);
  }

  async function loadQuestion() {
    setLoading(true);
    setSessionAiTranscript((prev) => [...prev, ...aiMessages]);
    setAiMessages([]);
    setAiInput("");
    setResult(null);
    setPicked(null);
    setFrozenElapsedSec(null);
    setQ(null);
    try {
      const res = await emergencyMcqApi.random();
      setQ(res.data);
    } catch (e: unknown) {
      const d = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setStatsError(typeof d === "string" ? d : "Soru yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(label: string) {
    if (!q || result) return;
    setPicked(label);
    const elapsedForRow =
      questionStartRef.current != null ? Math.floor((Date.now() - questionStartRef.current) / 1000) : null;
    if (questionStartRef.current) {
      setFrozenElapsedSec(elapsedForRow ?? 0);
    }
    try {
      const res = await emergencyMcqApi.verify(q.id, label);
      setResult(res.data);
      setSessionItems((prev) => [
        ...prev,
        {
          question_id: q.id,
          question_preview: q.question.slice(0, 2000),
          correct: res.data.correct,
          elapsed_sec: elapsedForRow,
          selected_label: label,
        },
      ]);
    } catch {
      setResult({ correct: false, correct_label: null, correct_answer_text: null });
      setSessionItems((prev) => [
        ...prev,
        {
          question_id: q.id,
          question_preview: q.question.slice(0, 2000),
          correct: false,
          elapsed_sec: elapsedForRow,
          selected_label: label,
        },
      ]);
    }
  }

  async function createSessionReport() {
    if (sessionItems.length === 0) {
      setReportError("Önce en az bir soruyu çözün.");
      return;
    }
    setReportLoading(true);
    setReportError(null);
    try {
      const allAi: AiMsg[] = [...sessionAiTranscript, ...aiMessages];
      const res = await emergencyMcqApi.createReport({
        items: sessionItems,
        ai_messages: allAi,
        patient_urges: sessionPatientUrges,
      });
      clearSessionProgress();
      router.push(`/simulasyon/acil/rapor/${res.data.id}`);
    } catch {
      setReportError("Rapor oluşturulamadı. Bağlantı veya sunucu yapılandırmasını kontrol edin.");
    } finally {
      setReportLoading(false);
    }
  }

  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!q || !text || aiStreaming) return;
    const nextMessages: AiMsg[] = [...aiMessages, { role: "user", content: text }];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiStreaming(true);

    try {
      await storage.waitForInit();
      const token = storage.getItem("access_token");
      const res = await fetch(`${getBaseUrl()}/emergency-mcq/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: q.id, messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Yanıt alınamadı. API anahtarı veya bağlantıyı kontrol edin." },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data) as { content?: string };
              if (parsed.content) accumulated += parsed.content;
            } catch {
              /* ignore */
            }
          }
        }
      }

      setAiMessages((prev) => [...prev, { role: "assistant", content: accumulated || "—" }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Bağlantı hatası." }]);
    } finally {
      setAiStreaming(false);
    }
  }

  const requestPatientUrge = useCallback(
    async (phase: "120" | "60", rem: number, el: number) => {
      const qid = q?.id;
      if (!qid) return;
      if (stats?.openai_configured === false) return;
      try {
        await storage.waitForInit();
        const token = storage.getItem("access_token");
        const res = await fetch(`${getBaseUrl()}/emergency-mcq/patient-urge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: qid,
            remaining_sec: rem,
            elapsed_sec: el,
            phase,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { message?: string; skipped?: boolean };
        if (data.skipped || !data.message?.trim()) return;
        const line = data.message!.trim();
        setPatientUrges((prev) => [...prev, { phase, text: line }]);
        setSessionPatientUrges((prev) => [...prev, line]);
      } catch {
        /* sessiz */
      }
    },
    [q?.id, stats?.openai_configured]
  );

  useEffect(() => {
    if (!q?.id || result) return;

    const liveElapsed =
      questionStartRef.current != null
        ? Math.floor((Date.now() - questionStartRef.current) / 1000)
        : 0;
    const rem = Math.max(0, QUESTION_TIME_LIMIT_SEC - liveElapsed);
    const el = liveElapsed;

    const prev = prevRemRef.current;
    if (prev === null) {
      prevRemRef.current = rem;
      return;
    }

    if (!urgeSentRef.current.p120 && prev > 120 && rem <= 120) {
      urgeSentRef.current.p120 = true;
      void requestPatientUrge("120", rem, el);
    }
    if (!urgeSentRef.current.p60 && prev > 60 && rem <= 60) {
      urgeSentRef.current.p60 = true;
      void requestPatientUrge("60", rem, el);
    }

    prevRemRef.current = rem;
  }, [q?.id, result, timerTick, requestPatientUrge]);

  if (!mounted) return null;

  void timerTick;
  const liveElapsedSec =
    questionStartRef.current && q && !result
      ? Math.floor((Date.now() - questionStartRef.current) / 1000)
      : 0;
  const elapsedSec = result && frozenElapsedSec !== null ? frozenElapsedSec : liveElapsedSec;
  const remainingSec = Math.max(0, QUESTION_TIME_LIMIT_SEC - elapsedSec);
  const remainingRatio = QUESTION_TIME_LIMIT_SEC > 0 ? remainingSec / QUESTION_TIME_LIMIT_SEC : 0;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/simulasyon" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{ background: "var(--primary)" }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Acil simülasyon</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">MCQ pratik · veri altyapısı</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <p className="text-xs font-medium mb-6 px-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Her soruda <strong style={{ color: "var(--text)" }}>{QUESTION_TIME_LIMIT_SEC / 60} dakikalık</strong> simüle süre hedefi (geri sayım); tetkik menüsü ve triyaj skoru sonraki adımlar. Birden fazla soru çözdükten sonra{" "}
          <strong style={{ color: "var(--text)" }}>Oturum raporu</strong> ile vaka simülasyonuna benzer AI özeti kaydedebilirsiniz (skor, öneriler, süre ve AI sohbeti).
        </p>

        {stats && (
          <p className="text-xs font-medium mb-6 px-1" style={{ color: "var(--text-muted)" }}>
            Havuzda <strong style={{ color: "var(--text)" }}>{stats.mcq_count}</strong> çoktan seçmeli soru (acil filtresi; kaynak: MedQA-USMLE).
            {stats.openai_configured === false ? (
              <span className="block mt-2" style={{ color: "var(--warning, #b45309)" }}>
                OPENAI_API_KEY yapılandırılmamış — AI asistan devre dışı.
              </span>
            ) : null}
          </p>
        )}

        {statsError && (
          <div
            className="flex items-start gap-2 text-sm font-medium px-4 py-3 rounded-2xl border mb-6"
            style={{
              borderColor: "var(--border)",
              color: "var(--warning, #b45309)",
              background: "color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent)",
            }}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{statsError}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <button
            type="button"
            disabled={loading || !!statsError}
            onClick={() => void loadQuestion()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide border disabled:opacity-50"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Yeni soru
          </button>
          <Link
            href="/simulasyon/acil/raporlar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border opacity-90 hover:opacity-100"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <FileText className="w-4 h-4" />
            Rapor geçmişi
          </Link>
        </div>

        {reportError && (
          <div
            className="flex items-start gap-2 text-sm font-medium px-4 py-3 rounded-2xl border mb-4"
            style={{
              borderColor: "var(--border)",
              color: "var(--error, #b91c1c)",
              background: "color-mix(in srgb, var(--error, #ef4444) 8%, transparent)",
            }}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{reportError}</span>
          </div>
        )}

        <div
          className="rounded-2xl border px-4 py-3 mb-8 flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 shrink-0 opacity-60" style={{ color: "var(--primary)" }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Bu oturumda {sessionItems.length} soru çözüldü
              {sessionItems.length > 0 ? (
                <span className="opacity-90">
                  {" "}
                  ({sessionItems.filter((x) => x.correct).length} doğru)
                </span>
              ) : null}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reportLoading || sessionItems.length === 0 || !!statsError}
              onClick={() => void createSessionReport()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide border disabled:opacity-50"
              style={{
                borderColor: "var(--primary)",
                background: "color-mix(in srgb, var(--primary) 12%, var(--surface))",
                color: "var(--text)",
              }}
            >
              {reportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Oturum raporu
            </button>
            <button
              type="button"
              disabled={
                sessionItems.length === 0 &&
                sessionAiTranscript.length === 0 &&
                sessionPatientUrges.length === 0
              }
              onClick={clearSessionProgress}
              className="text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-xl opacity-80 hover:opacity-100 disabled:opacity-30"
              style={{ color: "var(--text-muted)" }}
            >
              Oturum verisini sıfırla
            </button>
          </div>
        </div>

        {loading && !q && (
          <div className="flex items-center gap-2 text-sm font-medium justify-center py-16 opacity-80">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
            Soru yükleniyor…
          </div>
        )}

        {q && (
          <div
            className="mb-4 rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Timer className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide opacity-60" style={{ color: "var(--text-muted)" }}>
                  Simüle süre
                </span>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-black tabular-nums shrink-0">
                <span style={{ color: "var(--text-muted)" }}>
                  Geçen <span style={{ color: "var(--text)" }}>{fmtMmSs(elapsedSec)}</span>
                </span>
                <span style={{ color: remainingSec < 60 ? "var(--error, #dc2626)" : "var(--text-muted)" }}>
                  Kalan <span style={{ color: remainingSec < 60 ? "var(--error, #dc2626)" : "var(--text)" }}>{fmtMmSs(remainingSec)}</span>
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full" style={{ background: "color-mix(in srgb, var(--border) 80%, transparent)" }}>
              <div
                className="h-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${remainingRatio * 100}%`,
                  background:
                    remainingSec === 0
                      ? "var(--error, #dc2626)"
                      : remainingSec < 60
                        ? "color-mix(in srgb, var(--error, #f97316) 85%, var(--primary))"
                        : "var(--primary)",
                }}
              />
            </div>
            {remainingSec === 0 && !result && (
              <p className="px-4 py-2 text-[11px] font-medium leading-snug" style={{ color: "var(--warning, #b45309)", background: "color-mix(in srgb, var(--warning, #f59e0b) 8%, transparent)" }}>
                Süre doldu. Şık seçmeye veya AI ile çalışmaya devam edebilirsiniz; tam simülatörde bu aşamada skor kuralları sıkılaştırılabilir.
              </p>
            )}
          </div>
        )}

        {q && patientUrges.length > 0 && (
          <div
            className="mb-4 rounded-2xl border p-4 space-y-2"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--primary) 6%, var(--surface))",
            }}
          >
            <div
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <HeartPulse className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
              Hasta (simüle · süre baskısı)
            </div>
            <ul className="space-y-2 list-none m-0 p-0">
              {patientUrges.map((u, i) => (
                <li
                  key={`${u.phase}-${i}`}
                  className="text-sm font-medium leading-relaxed rounded-xl px-3 py-2 border"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                >
                  {u.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {q && (
          <div className="rounded-3xl border p-6 sm:p-8 space-y-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {q.question}
            </p>
            <ul className="space-y-2">
              {q.options.map((o) => {
                const disabled = !!result;
                const isPicked = picked === o.label;
                const showCorrect = result && result.correct_label === o.label.toUpperCase();
                const showWrong = result && isPicked && !result.correct;
                return (
                  <li key={o.label}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void submitAnswer(o.label)}
                      className="w-full text-left rounded-2xl border px-4 py-3 text-sm font-bold transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-90"
                      style={{
                        borderColor: showCorrect ? "var(--primary)" : showWrong ? "var(--error, #ef4444)" : "var(--border)",
                        background: showCorrect
                          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                          : showWrong
                            ? "color-mix(in srgb, var(--error, #ef4444) 10%, transparent)"
                            : "var(--bg)",
                        color: "var(--text)",
                      }}
                    >
                      <span className="opacity-60 mr-2">{o.label}.</span>
                      {o.text}
                    </button>
                  </li>
                );
              })}
            </ul>

            {result && (
              <div
                className="rounded-2xl border px-4 py-3 text-sm font-medium"
                style={{
                  borderColor: "var(--border)",
                  color: result.correct ? "var(--primary)" : "var(--error, #b91c1c)",
                  background: "color-mix(in srgb, var(--bg) 80%, transparent)",
                }}
              >
                {result.correct ? "Doğru." : "Yanlış."}
                {result.correct_label ? (
                  <span className="block mt-1 opacity-90" style={{ color: "var(--text)" }}>
                    Doğru şık: <strong>{result.correct_label}</strong>
                    {result.correct_answer_text ? ` (${result.correct_answer_text})` : ""}
                  </span>
                ) : null}
                {frozenElapsedSec !== null ? (
                  <span className="block mt-2 text-[11px] font-bold opacity-80" style={{ color: "var(--text-muted)" }}>
                    Cevaba kadar geçen süre: {fmtMmSs(frozenElapsedSec)} (limit {fmtMmSs(QUESTION_TIME_LIMIT_SEC)})
                  </span>
                ) : null}
              </div>
            )}
          </div>
        )}

        {q && (
          <div
            className="mt-8 rounded-3xl border p-5 sm:p-6 space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--text)" }}>
                AI asistan (acil)
              </h2>
            </div>
            <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Normal vaka sohbetinden ayrı uç nokta. Şıkkı doğrudan söyletmez; akıl yürütme ve acil öncelik üzerinden yönlendirir.{" "}
              <strong style={{ color: "var(--text)" }}>Paneldeki klasik vaka akışı değişmez.</strong>
            </p>

            <div
              className="max-h-64 overflow-y-auto rounded-2xl border px-3 py-3 space-y-3 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {aiMessages.length === 0 && !aiStreaming && (
                <p className="text-xs font-medium opacity-60">Örn: &quot;Red flag nedir?&quot; veya &quot;Triyajda önce neye bakarım?&quot;</p>
              )}
              {aiMessages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 ${m.role === "user" ? "ml-4" : "mr-4"}`}
                  style={{
                    background:
                      m.role === "user"
                        ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                        : "color-mix(in srgb, var(--text) 6%, transparent)",
                  }}
                >
                  <span className="text-[10px] font-black uppercase opacity-50 block mb-0.5">
                    {m.role === "user" ? "Siz" : "Asistan"}
                  </span>
                  <p className="whitespace-pre-wrap font-medium leading-relaxed">{m.content}</p>
                </div>
              ))}
              {aiStreaming && (
                <div className="flex items-center gap-2 text-xs font-medium opacity-70 px-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Yanıt yazılıyor…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendAiMessage();
                  }
                }}
                disabled={aiStreaming}
                placeholder="Sorunuzu yazın… (Enter gönderir)"
                rows={2}
                className="flex-1 rounded-2xl border px-3 py-2.5 text-sm font-medium resize-none disabled:opacity-50"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              />
              <button
                type="button"
                disabled={aiStreaming || !aiInput.trim()}
                onClick={() => void sendAiMessage()}
                className="shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center disabled:opacity-40"
                style={{ borderColor: "var(--border)", background: "var(--primary)", color: "white" }}
                aria-label="Gönder"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <p className="mt-10 text-xs font-medium leading-relaxed px-1" style={{ color: "var(--text-muted)" }}>
          Veri: Jin et al. MedQA-USMLE (lisans: backend <code className="text-[11px]">data/medical_qa/licenses</code>). Tıbbi karar vermez.
        </p>
      </main>

      <Footer />
    </div>
  );
}
