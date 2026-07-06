"use client";
import type { CSSProperties, ComponentType, ReactNode } from "react";
import { type ReportOut } from "@/lib/api";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  Stethoscope,
  Users,
  XCircle,
} from "lucide-react";

interface Props {
  report: ReportOut;
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70
      ? "var(--success)"
      : score >= 50
        ? "var(--warning)"
        : "var(--destructive)";

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ color: "var(--foreground)" }}
        >
          {Math.round(score)}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 md:p-6 ${className}`}>{children}</div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  iconStyle,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  title: string;
  iconStyle?: CSSProperties;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center border shrink-0"
        style={
          iconStyle ?? {
            borderColor: "var(--border)",
            background: "var(--accent-muted)",
            color: "var(--accent)",
          }
        }
      >
        <Icon className="w-4 h-4" />
      </div>
      <h3
        className="font-semibold text-base"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </h3>
    </div>
  );
}

export default function ReportView({ report }: Props) {
  const label =
    report.score >= 70
      ? {
          text: "Başarılı",
          style: {
            color: "var(--success)",
            background: "var(--success-muted)",
            borderColor: "var(--border)",
          },
        }
      : report.score >= 50
        ? {
            text: "Geliştirilmeli",
            style: {
              color: "var(--warning)",
              background: "var(--warning-muted)",
              borderColor: "var(--border)",
            },
          }
        : {
            text: "Yetersiz",
            style: {
              color: "var(--destructive)",
              background: "var(--destructive-muted)",
              borderColor: "var(--border)",
            },
          };

  return (
    <div className="space-y-4">
      <SectionCard className="text-center">
        <ScoreCircle score={report.score} />
        <span
          className="inline-flex items-center gap-1.5 mt-5 px-3 py-1 rounded-md border text-sm font-medium"
          style={label.style}
        >
          <CheckCircle2 className="w-4 h-4" />
          {label.text}
        </span>
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          {new Date(report.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard>
          <SectionHeader
            icon={CheckCircle2}
            title="Doğru tanılar"
            iconStyle={{
              borderColor: "var(--border)",
              background: "var(--success-muted)",
              color: "var(--success)",
            }}
          />
          {report.correct_diagnoses.length === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--muted)" }}>
              Doğru tanı bulunamadı.
            </p>
          ) : (
            <ul className="space-y-2">
              {report.correct_diagnoses.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-medium border shrink-0"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--success-muted)",
                      color: "var(--success)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard>
          <SectionHeader
            icon={XCircle}
            title="Atlanmış tanılar"
            iconStyle={{
              borderColor: "var(--border)",
              background: "var(--destructive-muted)",
              color: "var(--destructive)",
            }}
          />
          {report.missed_diagnoses.length === 0 ? (
            <p
              className="text-sm flex items-center gap-2"
              style={{ color: "var(--success)" }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Harika, hiç tanı atlanmadı.
            </p>
          ) : (
            <ul className="space-y-2">
              {report.missed_diagnoses.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-medium border shrink-0"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--destructive-muted)",
                      color: "var(--destructive)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {report.pathophysiology_note && (
        <SectionCard>
          <SectionHeader icon={BookOpen} title="Patofizyoloji analizi" />
          <div
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: "var(--foreground)" }}
          >
            {report.pathophysiology_note}
          </div>
        </SectionCard>
      )}

      {report.tus_reference && (
        <SectionCard>
          <SectionHeader icon={ExternalLink} title="TUS / akademik kaynak" />
          <div
            className="text-sm leading-relaxed whitespace-pre-line border-l-2 pl-4"
            style={{
              color: "var(--foreground)",
              borderColor: "var(--accent)",
            }}
          >
            {report.tus_reference}
          </div>
        </SectionCard>
      )}

      {report.recommendations && report.recommendations.length > 0 && (
        <SectionCard>
          <SectionHeader icon={Lightbulb} title="Gelişim önerileri" />
          <ul className="space-y-3">
            {report.recommendations.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-medium border shrink-0 mt-0.5"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-muted)",
                    color: "var(--muted)",
                  }}
                >
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {report.clinical_reasoning && (
        <SectionCard>
          <SectionHeader
            icon={Brain}
            title="Klinik akıl yürütme analizi"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              {
                icon: MessageSquare,
                label: "Anamnez",
                value: report.clinical_reasoning.anamnez_sayisi,
              },
              {
                icon: FlaskConical,
                label: "Tetkik",
                value: report.clinical_reasoning.tetkik_sayisi,
              },
              {
                icon: Stethoscope,
                label: "Fizik muayene",
                value: report.clinical_reasoning.fizik_muayene_sayisi,
              },
              {
                icon: Users,
                label: "Konsültasyon",
                value: report.clinical_reasoning.konsultasyon_sayisi,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-md p-3 border text-center"
                style={{
                  background: "var(--surface-muted)",
                  borderColor: "var(--border)",
                }}
              >
                <Icon
                  className="w-4 h-4 mx-auto mb-1.5"
                  style={{ color: "var(--accent)" }}
                />
                <p
                  className="text-xl font-semibold tabular-nums"
                  style={{ color: "var(--foreground)" }}
                >
                  {value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {[
              {
                text: report.clinical_reasoning.anamnez_yorum,
                good: report.clinical_reasoning.ilk_eylem_oncesi_anamnez >= 4,
              },
              {
                text: report.clinical_reasoning.fizik_yorum,
                good: report.clinical_reasoning.fizik_muayene_sayisi > 0,
              },
            ].map(({ text, good }, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-md px-3 py-2.5 text-sm border"
                style={{
                  background: good
                    ? "var(--success-muted)"
                    : "var(--warning-muted)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {good ? (
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: "var(--success)" }}
                  />
                ) : (
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: "var(--warning)" }}
                  />
                )}
                {text}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
