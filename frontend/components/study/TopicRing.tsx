"use client";

type Props = {
  label: string;
  masteryPct: number;
  seen: number;
  href?: string | null;
};

export function TopicRing({ label, masteryPct, seen }: Props) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (masteryPct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1 min-w-[4.5rem]">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={seen > 0 ? offset : c}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-bold text-center leading-tight opacity-80 max-w-[5rem]">{label}</span>
      <span className="text-[9px] opacity-40">{seen > 0 ? `${Math.round(masteryPct)}%` : "—"}</span>
    </div>
  );
}
