"use client";

type Props = {
  current: number;
  total: number;
  correct: number;
};

export function SessionProgress({ current, total, correct }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold opacity-60">
        <span>
          Soru {current} / {total}
        </span>
        <span>{correct} doğru</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: "var(--primary)" }}
        />
      </div>
    </div>
  );
}
