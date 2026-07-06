"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { StudyNav } from "@/components/study/StudyNav";
import { McqCard } from "@/components/study/McqCard";
import { SessionProgress } from "@/components/study/SessionProgress";
import { AnswerFeedback } from "@/components/study/AnswerFeedback";
import { SessionSummary } from "@/components/study/SessionSummary";
import {
  studyApi,
  type StudyAnswerResult,
  type StudyQuestion,
  type StudySessionStart,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import Footer from "@/components/Footer";

type Mode = "daily" | "usmle";

export default function DailySession({ mode: modeProp }: { mode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: Mode =
    modeProp || (searchParams.get("mode") === "usmle" ? "usmle" : "daily");
  const goalParam = searchParams.get("goal");
  const initialGoal = goalParam === "5" || goalParam === "20" ? Number(goalParam) : 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StudySessionStart | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StudyAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const questionStart = useRef<number>(Date.now());

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDone(false);
    setIndex(0);
    setPicked(null);
    setResult(null);
    setCorrectCount(0);
    setWeakTopics([]);
    try {
      const res = await studyApi.startSession(initialGoal, mode === "usmle" ? "usmle" : "daily");
      setSession(res.data);
      questionStart.current = Date.now();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Oturum başlatılamadı")
          : "Oturum başlatılamadı";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [initialGoal, mode]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/login?next=/calis/oturum${mode === "usmle" ? "?mode=usmle" : ""}`);
      return;
    }
    startSession();
  }, [router, startSession, mode]);

  const current: StudyQuestion | undefined = session?.questions[index];

  const submit = async (label: string) => {
    if (!current || !session || submitting || result) return;
    setPicked(label);
    setSubmitting(true);
    const elapsed = Date.now() - questionStart.current;
    try {
      const res = await studyApi.answer({
        mcq_id: current.mcq_id,
        pool: current.pool,
        selected_label: label,
        session_id: session.session_id,
        elapsed_ms: elapsed,
      });
      setResult(res.data);
      if (res.data.correct) setCorrectCount((c) => c + 1);
      else if (res.data.remediation?.topic_label) {
        setWeakTopics((w) =>
          w.includes(res.data.remediation!.topic_label)
            ? w
            : [...w, res.data.remediation!.topic_label],
        );
      }
      setDueCount(res.data.due_count);
    } catch {
      setError("Cevap gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!session) return;
    if (index + 1 >= session.questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setResult(null);
    questionStart.current = Date.now();
  };

  const title = mode === "usmle" ? "USMLE Pratik" : "Günlük Çalışma";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <StudyNav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/calis" className="p-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        {mode === "usmle" && (
          <p
            className="text-xs font-medium px-3 py-2 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}
          >
            Gelişmiş mod — İngilizce USMLE havuzu
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin opacity-50" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm p-4 rounded-xl border" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && session && !done && current && (
          <>
            <SessionProgress
              current={index + 1}
              total={session.questions.length}
              correct={correctCount}
            />
            {!result ? (
              <McqCard
                question={current}
                picked={picked}
                disabled={submitting}
                onPick={submit}
              />
            ) : (
              <AnswerFeedback
                result={result}
                onNext={next}
                isLast={index + 1 >= session.questions.length}
              />
            )}
          </>
        )}

        {done && session && (
          <SessionSummary
            correct={correctCount}
            total={session.questions.length}
            dueCount={dueCount}
            weakTopics={weakTopics}
            onRestart={startSession}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
