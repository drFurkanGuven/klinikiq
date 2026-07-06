"use client";

import Link from "next/link";
import { Trophy, RotateCcw, Home } from "lucide-react";
import { nativeClient } from "@/lib/native";

type Props = {
  correct: number;
  total: number;
  dueCount: number;
  weakTopics: string[];
  onRestart: () => void;
};

export function SessionSummary({ correct, total, dueCount, weakTopics, onRestart }: Props) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="rounded-2xl border p-6 space-y-6 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <Trophy className="w-12 h-12 mx-auto" style={{ color: "var(--warning)" }} />
      <div>
        <p className="text-3xl font-black">{pct}%</p>
        <p className="text-sm opacity-60 mt-1">
          {correct} / {total} doğru
        </p>
      </div>
      {weakTopics.length > 0 && (
        <div className="text-left space-y-2">
          <p className="text-xs font-black uppercase tracking-widest opacity-40">Zayıf konular</p>
          <ul className="space-y-1">
            {weakTopics.slice(0, 3).map((t) => (
              <li key={t} className="text-sm font-medium opacity-80">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm opacity-60">Yarın tekrar için hazır: {dueCount} soru</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border"
          style={{ borderColor: "var(--border)" }}
        >
          <RotateCcw className="w-4 h-4" />
          Yeniden
        </button>
        <Link
          href="/calis"
          onClick={() => nativeClient.impact()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
          style={{ background: "var(--primary)", color: "var(--primary-fg, #fff)" }}
        >
          <Home className="w-4 h-4" />
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
