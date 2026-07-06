"use client";
import { useRouter } from "next/navigation";
import { type Case } from "@/lib/api";
import { sessionsApi } from "@/lib/api";
import { useState } from "react";
import {
  Heart,
  Activity,
  Brain,
  Wind,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";

const SPECIALTY_MAP: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  cardiology: { label: "Kardiyoloji", Icon: Heart, color: "text-red-400", bg: "bg-red-500/10" },
  endocrinology: { label: "Endokrinoloji", Icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10" },
  neurology: { label: "Nöroloji", Icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10" },
  pulmonology: { label: "Pulmonoloji", Icon: Wind, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  default: { label: "Genel", Icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10" },
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: "Kolay", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  medium: { label: "Orta", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  hard: { label: "Zor", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

interface Props {
  case: Case;
}

export default function CaseCard({ case: c }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const spec = SPECIALTY_MAP[c.specialty] || SPECIALTY_MAP.default;
  const diff = DIFFICULTY_MAP[c.difficulty] || DIFFICULTY_MAP.medium;

  async function startSession() {
    setStarting(true);
    try {
      const res = await sessionsApi.create(c.id);
      router.push(`/case/${res.data.id}`);
    } catch {
      setStarting(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-6 border border-slate-800 card-hover flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${spec.bg} flex items-center justify-center`}>
          <spec.Icon className={`w-5 h-5 ${spec.color}`} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${diff.color}`}>
          {diff.label}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-semibold text-white text-base leading-snug mb-2">{c.title}</h3>
      <p className="text-sm text-slate-400 mb-1">{spec.label}</p>
      {c.chief_complaint && (
        <p className="text-sm text-slate-500 mt-2 flex-1 line-clamp-2">
          "{c.chief_complaint}"
        </p>
      )}

      {/* Patient info */}
      {(c.patient_age || c.patient_gender) && (
        <div className="flex gap-3 mt-3 text-xs text-slate-500">
          {c.patient_age && <span>🧑 {c.patient_age} yaş</span>}
          {c.patient_gender && <span>⚥ {c.patient_gender}</span>}
        </div>
      )}

      {/* CTA */}
      <button
        id={`start-case-${c.id}`}
        onClick={startSession}
        disabled={starting}
        className="mt-5 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-medium py-2.5 rounded-xl transition-all duration-200 text-sm disabled:opacity-60"
      >
        {starting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Başlatılıyor...
          </>
        ) : (
          <>
            Vakayı Başlat
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
