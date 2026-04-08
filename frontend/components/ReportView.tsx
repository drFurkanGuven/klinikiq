"use client";
import { type ReportOut } from "@/lib/api";
import { CheckCircle2, XCircle, BookOpen, Star, ExternalLink } from "lucide-react";

interface Props {
  report: ReportOut;
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

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
        <span className="text-4xl font-black" style={{ color: "var(--text)" }}>{Math.round(score)}</span>
        <span className="text-xs font-bold opacity-40" style={{ color: "var(--text-muted)" }}>/ 100</span>
      </div>
    </div>
  );
}

export default function ReportView({ report }: Props) {
  const label =
    report.score >= 70
      ? { text: "Başarılı", color: "text-emerald-500", bg: "var(--success-light)", borderColor: "var(--success-light)" }
      : report.score >= 50
      ? { text: "Geliştirilmeli", color: "text-amber-500", bg: "var(--warning-light)", borderColor: "var(--warning-light)" }
      : { text: "Yetersiz", color: "text-red-500", bg: "var(--error-light)", borderColor: "var(--error-light)" };

  return (
    <div className="space-y-6">
      {/* Skor */}
      <div className="glass rounded-3xl p-10 border text-center transition-all shadow-md" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <ScoreCircle score={report.score} />
        <div className={`inline-flex items-center gap-2 mt-6 px-5 py-2 rounded-full border text-sm font-bold shadow-sm ${label.color}`}
          style={{ background: label.bg, borderColor: label.borderColor }}>
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

      {/* Tanı Analizi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Doğru Tanılar */}
        <div className="glass rounded-3xl p-6 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Doğru Tanılar</h3>
          </div>
          {report.correct_diagnoses.length === 0 ? (
            <p className="text-sm font-medium opacity-40 italic" style={{ color: "var(--text-muted)" }}>Doğru tanı bulunamadı.</p>
          ) : (
            <ul className="space-y-3">
              {report.correct_diagnoses.map((d, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--success)" }}>
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-black border border-emerald-500/20">
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Atlanmış Tanılar */}
        <div className="glass rounded-3xl p-6 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Atlanmış Tanılar</h3>
          </div>
          {report.missed_diagnoses.length === 0 ? (
            <p className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--success)" }}>
               <Star className="w-4 h-4 fill-current" />
               Harika, hiç tanı atlanmadı!
            </p>
          ) : (
            <ul className="space-y-3">
              {report.missed_diagnoses.map((d, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--danger)" }}>
                  <span className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-[10px] font-black border border-red-500/20">
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Patofizyoloji */}
      {report.pathophysiology_note && (
        <div className="glass rounded-3xl p-8 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Patofizyoloji Analizi</h3>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-line font-medium opacity-90" style={{ color: "var(--text)" }}>
            {report.pathophysiology_note}
          </div>
        </div>
      )}

      {/* TUS Referansı */}
      {report.tus_reference && (
        <div className="glass rounded-3xl p-8 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--primary-light)" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)", color: "white" }}>
              <ExternalLink className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--primary)" }}>TUS / Akademik Kaynak</h3>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-line font-black border-l-4 pl-4" style={{ color: "var(--text)", borderColor: "var(--primary)" }}>
            {report.tus_reference}
          </div>
        </div>
      )}

      {/* Öneriler */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="glass rounded-3xl p-8 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h3 className="font-bold text-lg mb-6" style={{ color: "var(--text)" }}>💡 Gelişim Önerileri</h3>
          <ul className="space-y-4">
            {report.recommendations.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3.5 text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                <span className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-[11px] text-blue-500 font-black flex-shrink-0 mt-0.5 border border-blue-500/10">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
