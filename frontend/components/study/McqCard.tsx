"use client";

import type { StudyQuestion } from "@/lib/api";

type Props = {
  question: StudyQuestion;
  picked: string | null;
  disabled: boolean;
  onPick: (label: string) => void;
};

export function McqCard({ question, picked, disabled, onPick }: Props) {
  return (
    <div className="space-y-5">
      {question.is_review && (
        <span
          className="inline-block text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
          style={{ background: "color-mix(in srgb, var(--warning) 18%, transparent)", color: "var(--warning)" }}
        >
          Tekrar
        </span>
      )}
      {question.topic_label && (
        <span className="text-xs font-bold opacity-50">{question.topic_label}</span>
      )}
      <p className="text-base sm:text-lg font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt) => {
          const selected = picked === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={disabled}
              onClick={() => onPick(opt.label)}
              className="w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all disabled:opacity-70"
              style={{
                borderColor: selected ? "var(--primary)" : "var(--border)",
                background: selected
                  ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                  : "var(--surface)",
                color: "var(--text)",
              }}
            >
              <span className="font-black mr-2 opacity-60">{opt.label}.</span>
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
