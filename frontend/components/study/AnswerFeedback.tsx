"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Map } from "lucide-react";
import type { StudyAnswerResult } from "@/lib/api";
import { nativeClient } from "@/lib/native";

type Props = {
  result: StudyAnswerResult;
  onNext: () => void;
  isLast: boolean;
};

export function AnswerFeedback({ result, onNext, isLast }: Props) {
  const ok = result.correct;
  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{
        borderColor: ok ? "color-mix(in srgb, var(--success) 40%, var(--border))" : "color-mix(in srgb, var(--danger) 40%, var(--border))",
        background: ok
          ? "color-mix(in srgb, var(--success) 8%, var(--surface))"
          : "color-mix(in srgb, var(--danger) 8%, var(--surface))",
      }}
    >
      <div className="flex items-center gap-2 font-black text-lg">
        {ok ? (
          <>
            <CheckCircle2 className="w-6 h-6" style={{ color: "var(--success)" }} />
            Doğru
          </>
        ) : (
          <>
            <XCircle className="w-6 h-6" style={{ color: "var(--danger)" }} />
            Yanlış
          </>
        )}
      </div>
      {!ok && result.correct_label && (
        <p className="text-sm opacity-80">
          Doğru cevap: <strong>{result.correct_label}</strong>
          {result.correct_answer_text ? ` — ${result.correct_answer_text}` : ""}
        </p>
      )}
      {ok && result.correct_answer_text && (
        <p className="text-sm opacity-80">{result.correct_answer_text}</p>
      )}
      {!ok && result.remediation?.map_href && (
        <Link
          href={result.remediation.map_href}
          onClick={() => nativeClient.impact()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "var(--primary)", color: "var(--primary-fg, #fff)" }}
        >
          <Map className="w-4 h-4" />
          Bu mantığı haritada gör
          {result.remediation.topic_label ? ` (${result.remediation.topic_label})` : ""}
        </Link>
      )}
      <button
        type="button"
        onClick={onNext}
        className="w-full py-3 rounded-xl font-black text-sm"
        style={{ background: "var(--primary)", color: "var(--primary-fg, #fff)" }}
      >
        {isLast ? "Özeti gör" : "Sonraki soru"}
      </button>
    </div>
  );
}
