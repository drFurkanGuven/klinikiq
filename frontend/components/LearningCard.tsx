"use client";

import { useState } from "react";
import type { LearningCard as LearningCardT } from "@/lib/api";
import { Brain, GraduationCap } from "lucide-react";

const SPEC_LABEL: Record<string, string> = {
  cardiology: "Kardiyoloji",
  neurology: "Nöroloji",
  nephrology: "Nefroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  hematology: "Hematoloji",
  infectious_disease: "Enfeksiyon",
  rheumatology: "Romatoloji",
  endocrinology: "Endokrinoloji",
  dermatology: "Dermatoloji",
  other: "Diğer",
};

function specialtyLabel(s: string) {
  return SPEC_LABEL[s] || s;
}

interface Props {
  card: LearningCardT;
}

export default function LearningCard({ card }: Props) {
  const [expandPatho, setExpandPatho] = useState(false);
  const [expandTus, setExpandTus] = useState(false);
  const patho = card.pathophysiology_note?.trim();
  const tus = card.tus_reference?.trim();
  const longPatho = patho && patho.length > 400;
  const longTus = tus && tus.length > 300;

  return (
    <article
      className="rounded-2xl sm:rounded-3xl border p-4 sm:p-8 space-y-4 sm:space-y-5 flex flex-col transition-colors hover:shadow-lg active:opacity-[0.98]"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: "var(--text-muted)" }}>
            {specialtyLabel(card.specialty)} · {card.difficulty}
          </p>
          <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug" style={{ color: "var(--text)" }}>
            {card.case_title}
          </h2>
        </div>
        <div
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black tabular-nums"
          style={{
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            color: "var(--primary)",
          }}
        >
          Skor {Math.round(card.score)}
        </div>
      </header>

      {patho ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Brain className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-black uppercase tracking-wide">Patofizyoloji özeti</span>
          </div>
          <p
            className={`text-[15px] sm:text-sm font-medium leading-relaxed whitespace-pre-wrap pl-4 sm:pl-6 ${
              longPatho && !expandPatho ? "line-clamp-6" : ""
            }`}
            style={{ color: "var(--text-muted)" }}
          >
            {patho}
          </p>
          {longPatho ? (
            <button
              type="button"
              onClick={() => setExpandPatho(!expandPatho)}
              className="text-sm sm:text-xs font-bold pl-4 sm:pl-6 pr-2 py-3 -my-1 -ml-1 rounded-lg text-left opacity-90 hover:opacity-100 touch-manipulation min-h-[44px] flex items-center"
              style={{ color: "var(--primary)" }}
            >
              {expandPatho ? "Daralt" : "Devamını göster"}
            </button>
          ) : null}
        </section>
      ) : null}

      {tus ? (
        <section className="space-y-2 border-t pt-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2" style={{ color: "var(--text)" }}>
            <GraduationCap className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-black uppercase tracking-wide">TUS / çalışma notu</span>
          </div>
          <p
            className={`text-[15px] sm:text-sm font-medium leading-relaxed whitespace-pre-wrap pl-4 sm:pl-6 ${
              longTus && !expandTus ? "line-clamp-5" : ""
            }`}
            style={{ color: "var(--text-muted)" }}
          >
            {tus}
          </p>
          {longTus ? (
            <button
              type="button"
              onClick={() => setExpandTus(!expandTus)}
              className="text-sm sm:text-xs font-bold pl-4 sm:pl-6 pr-2 py-3 -my-1 -ml-1 rounded-lg text-left opacity-90 hover:opacity-100 touch-manipulation min-h-[44px] flex items-center"
              style={{ color: "var(--primary)" }}
            >
              {expandTus ? "Daralt" : "Devamını göster"}
            </button>
          ) : null}
        </section>
      ) : null}

      <div className="border-t pt-4 text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
        Kaynak: tamamlanan vaka raporu özeti ·{" "}
        {new Date(card.created_at).toLocaleString("tr-TR", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </article>
  );
}
