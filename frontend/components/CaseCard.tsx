"use client";
import { useRouter } from "next/navigation";
import { type Case } from "@/lib/api";
import { sessionsApi } from "@/lib/api";
import { useState, type CSSProperties } from "react";
import {
  Heart,
  Activity,
  Brain,
  Wind,
  Zap,
  ArrowRight,
  Loader2,
  User,
} from "lucide-react";

const SPECIALTY_MAP: Record<
  string,
  { label: string; Icon: typeof Heart }
> = {
  cardiology: { label: "Kardiyoloji", Icon: Heart },
  endocrinology: { label: "Endokrinoloji", Icon: Activity },
  neurology: { label: "Nöroloji", Icon: Brain },
  pulmonology: { label: "Pulmonoloji", Icon: Wind },
  default: { label: "Genel", Icon: Zap },
};

const DIFFICULTY_MAP: Record<
  string,
  { label: string; style: CSSProperties }
> = {
  easy: {
    label: "Kolay",
    style: {
      color: "var(--success)",
      background: "var(--success-muted)",
      borderColor: "var(--border)",
    },
  },
  medium: {
    label: "Orta",
    style: {
      color: "var(--warning)",
      background: "var(--warning-muted)",
      borderColor: "var(--border)",
    },
  },
  hard: {
    label: "Zor",
    style: {
      color: "var(--destructive)",
      background: "var(--destructive-muted)",
      borderColor: "var(--border)",
    },
  },
};

interface Props {
  case: Case;
}

export default function CaseCard({ case: c }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const spec = SPECIALTY_MAP[c.specialty] || SPECIALTY_MAP.default;
  const diff =
    DIFFICULTY_MAP[c.difficulty] || DIFFICULTY_MAP.medium;

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
    <div className="card p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center border"
          style={{
            borderColor: "var(--border)",
            background: "var(--accent-muted)",
            color: "var(--accent)",
          }}
        >
          <spec.Icon className="w-4 h-4" />
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-md border"
          style={diff.style}
        >
          {diff.label}
        </span>
      </div>

      <h3
        className="font-semibold text-base leading-snug mb-1"
        style={{ color: "var(--foreground)" }}
      >
        {c.title}
      </h3>
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
        {spec.label}
      </p>
      {c.chief_complaint && (
        <p
          className="text-sm mt-2 flex-1 line-clamp-2"
          style={{ color: "var(--muted)" }}
        >
          &ldquo;{c.chief_complaint}&rdquo;
        </p>
      )}

      {(c.patient_age || c.patient_gender) && (
        <div
          className="flex flex-wrap gap-3 mt-3 text-xs"
          style={{ color: "var(--muted)" }}
        >
          {c.patient_age != null && (
            <span className="inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {c.patient_age} yaş
            </span>
          )}
          {c.patient_gender && (
            <span className="inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {c.patient_gender}
            </span>
          )}
        </div>
      )}

      <button
        id={`start-case-${c.id}`}
        type="button"
        onClick={startSession}
        disabled={starting}
        className="btn-primary mt-5 w-full text-sm py-2.5 disabled:opacity-60"
      >
        {starting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Başlatılıyor…
          </>
        ) : (
          <>
            Vakayı başlat
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
