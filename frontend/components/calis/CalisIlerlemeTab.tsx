"use client";

import { useEffect, useState } from "react";
import { BookOpen, Trophy, BarChart3, Loader2 } from "lucide-react";
import { usersApi, type HistoryItem } from "@/lib/api";
import { AccountSettingsPanel } from "@/components/account/AccountSettingsPanel";

function computeStats(history: HistoryItem[]) {
  const completedHistory = history.filter((h) => h.status === "completed" && h.score != null);
  const bestScoresByCase = new Map<string, number>();

  completedHistory.forEach((h) => {
    const currentHighest = bestScoresByCase.get(h.case_title) || 0;
    if (h.score! > currentHighest) {
      bestScoresByCase.set(h.case_title, h.score!);
    }
  });

  const uniqueCompletedCount = bestScoresByCase.size;
  const uniqueTotalCount = new Set(history.map((h) => h.case_title)).size;
  const avgScore =
    uniqueCompletedCount > 0
      ? Math.round(
          Array.from(bestScoresByCase.values()).reduce((sum, score) => sum + score, 0) /
            uniqueCompletedCount
        )
      : null;

  return { uniqueCompletedCount, uniqueTotalCount, avgScore };
}

export function CalisIlerlemeTab() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.history()
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { uniqueCompletedCount, uniqueTotalCount, avgScore } = computeStats(history);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--foreground)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>Vaka istatistikleri</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <BookOpen className="w-4 h-4 mb-2" style={{ color: "var(--foreground)" }} />
            <p className="text-lg sm:text-2xl font-semibold tabular-nums">{uniqueTotalCount}</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Vakalar</p>
          </div>
          <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Trophy className="w-4 h-4 mb-2" style={{ color: "var(--foreground)" }} />
            <p className="text-lg sm:text-2xl font-semibold tabular-nums">{avgScore ?? "—"}</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Ort. skor</p>
          </div>
          <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <BarChart3 className="w-4 h-4 mb-2" style={{ color: "var(--foreground)" }} />
            <p className="text-lg sm:text-2xl font-semibold tabular-nums">{uniqueCompletedCount}</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Tamamlanan</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-4" style={{ color: "var(--muted)" }}>Hesap ayarları</p>
        <AccountSettingsPanel />
      </div>
    </div>
  );
}
