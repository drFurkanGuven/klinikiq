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
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
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
        <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export default function ReportView({ report }: Props) {
  const label =
    report.score >= 70
      ? { text: "Başarılı", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
      : report.score >= 50
      ? { text: "Geliştirilmeli", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" }
      : { text: "Yetersiz", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };

  return (
    <div className="space-y-6">
      {/* Skor */}
      <div className="glass rounded-2xl p-8 border border-slate-800 text-center">
        <ScoreCircle score={report.score} />
        <div className={`inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full border text-sm font-medium ${label.bg} ${label.color}`}>
          <Star className="w-4 h-4" />
          {label.text}
        </div>
        <p className="text-slate-400 text-sm mt-2">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Doğru Tanılar */}
        <div className="glass rounded-2xl p-5 border border-emerald-500/10">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Doğru Tanılar</h3>
          </div>
          {report.correct_diagnoses.length === 0 ? (
            <p className="text-sm text-slate-500">Doğru tanı bulunamadı.</p>
          ) : (
            <ul className="space-y-2">
              {report.correct_diagnoses.map((d, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-emerald-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Atlanmış Tanılar */}
        <div className="glass rounded-2xl p-5 border border-red-500/10">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-white">Atlanmış Tanılar</h3>
          </div>
          {report.missed_diagnoses.length === 0 ? (
            <p className="text-sm text-emerald-400">Hiç tanı atlanmadı! 🎉</p>
          ) : (
            <ul className="space-y-2">
              {report.missed_diagnoses.map((d, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-red-300">
                  <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold">
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
        <div className="glass rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Patofizyoloji Notu</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {report.pathophysiology_note}
          </p>
        </div>
      )}

      {/* TUS Referansı */}
      {report.tus_reference && (
        <div className="glass rounded-2xl p-6 border border-blue-500/10">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-white">TUS Referansı</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {report.tus_reference}
          </p>
        </div>
      )}

      {/* Öneriler */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="glass rounded-2xl p-6 border border-slate-800">
          <h3 className="font-semibold text-white mb-4">💡 Öneriler</h3>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-slate-300"
              >
                <span className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-xs text-blue-400 font-bold flex-shrink-0 mt-0.5">
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
