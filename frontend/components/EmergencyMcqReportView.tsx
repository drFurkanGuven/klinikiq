"use client";

import type { EmergencyMcqReportOut } from "@/lib/api";
import { BookOpen, CheckCircle2, Clock, MessageCircle, Star, Stethoscope, XCircle } from "lucide-react";

interface Props {
  report: EmergencyMcqReportOut;
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black" style={{ color: "var(--text)" }}>
          {Math.round(score)}
        </span>
        <span className="text-xs font-bold opacity-40" style={{ color: "var(--text-muted)" }}>
          / 100
        </span>
      </div>
    </div>
  );
}

export default function EmergencyMcqReportView({ report }: Props) {
  const label =
    report.score >= 70
      ? { text: "İyi", color: "text-emerald-500", bg: "var(--success-light)", borderColor: "var(--success-light)" }
      : report.score >= 50
        ? { text: "Geliştirilmeli", color: "text-amber-500", bg: "var(--warning-light)", borderColor: "var(--warning-light)" }
        : { text: "Tekrar önerilir", color: "text-red-500", bg: "var(--error-light)", borderColor: "var(--error-light)" };

  return (
    <div className="space-y-6">
      <div
        className="glass rounded-3xl p-10 border text-center transition-all shadow-md"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <ScoreCircle score={report.score} />
        <p className="text-sm font-medium mt-4 opacity-80" style={{ color: "var(--text-muted)" }}>
          {report.correct_count} / {report.total_count} soru doğru
        </p>
        <div
          className={`inline-flex items-center gap-2 mt-6 px-5 py-2 rounded-full border text-sm font-bold shadow-sm ${label.color}`}
          style={{ background: label.bg, borderColor: label.borderColor }}
        >
          <Star className="w-4 h-4 fill-current" />
          {label.text}
        </div>
        <p className="text-sm mt-4 font-medium opacity-50" style={{ color: "var(--text-muted)" }}>
          {new Date(report.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {report.overview_note ? (
        <div className="glass rounded-3xl p-6 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-600 border border-sky-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
              Genel değerlendirme
            </h3>
          </div>
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {report.overview_note}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
              Güçlü yönler
            </h3>
          </div>
          {report.strengths.length === 0 ? (
            <p className="text-sm opacity-60">—</p>
          ) : (
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-sm font-medium leading-relaxed flex gap-2" style={{ color: "var(--text)" }}>
                  <span className="text-emerald-500 shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-3xl p-6 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
              Eksikler / tekrar
            </h3>
          </div>
          {report.gaps.length === 0 ? (
            <p className="text-sm opacity-60">—</p>
          ) : (
            <ul className="space-y-2">
              {report.gaps.map((s, i) => (
                <li key={i} className="text-sm font-medium leading-relaxed flex gap-2" style={{ color: "var(--text)" }}>
                  <span className="text-rose-500 shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(report.time_management_note || report.ai_chat_note || report.patient_urge_note) && (
        <div className="glass rounded-3xl p-6 border space-y-4 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h3 className="font-bold text-sm uppercase tracking-widest opacity-60" style={{ color: "var(--text-muted)" }}>
            Oturum bağlamı
          </h3>
          {report.time_management_note ? (
            <div className="flex gap-3">
              <Clock className="w-5 h-5 shrink-0 mt-0.5 opacity-70" style={{ color: "var(--primary)" }} />
              <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text)" }}>
                {report.time_management_note}
              </p>
            </div>
          ) : null}
          {report.ai_chat_note ? (
            <div className="flex gap-3">
              <MessageCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-70" style={{ color: "var(--primary)" }} />
              <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text)" }}>
                {report.ai_chat_note}
              </p>
            </div>
          ) : null}
          {report.patient_urge_note ? (
            <p className="text-sm font-medium leading-relaxed pl-8 opacity-90" style={{ color: "var(--text-muted)" }}>
              {report.patient_urge_note}
            </p>
          ) : null}
        </div>
      )}

      {report.tus_reference ? (
        <div className="glass rounded-3xl p-6 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-600 border border-violet-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
              TUS / çalışma notu
            </h3>
          </div>
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {report.tus_reference}
          </p>
        </div>
      ) : null}

      {report.recommendations && report.recommendations.length > 0 && (
        <div className="glass rounded-3xl p-6 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text)" }}>
            Öneriler
          </h3>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-sm font-medium leading-relaxed flex gap-2" style={{ color: "var(--text)" }}>
                <span className="opacity-40 shrink-0">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
