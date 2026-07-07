"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, MapPin, Play, RotateCcw } from "lucide-react";
import type { PharmaMap } from "@/lib/api";
import {
  buildPathTree,
  getFillOrder,
  getWalkOrder,
  shuffleOptions,
  type PathTreeNode,
} from "@/lib/pharmaPathTree";
import { markPathTreeCompleted } from "@/lib/pharmaProgress";
import { nativeClient } from "@/lib/native";

type Mode = "idle" | "watch" | "fill" | "done";

function TreeNodeView({
  node,
  revealed,
  currentId,
  walkerId,
  depth = 0,
}: {
  node: PathTreeNode;
  revealed: Set<string>;
  currentId: string | null;
  walkerId: string | null;
  depth?: number;
}) {
  const isRevealed = revealed.has(node.id);
  const isCurrent = currentId === node.id;
  const hasWalker = walkerId === node.id;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative px-3 py-2 rounded-lg border text-xs font-medium text-center min-w-[5.5rem] max-w-[8rem] transition-all duration-500"
        style={{
          borderColor: isCurrent ? "var(--accent)" : isRevealed ? "var(--border)" : "var(--border)",
          background: isCurrent
            ? "color-mix(in srgb, var(--accent) 12%, var(--surface))"
            : isRevealed
              ? "var(--surface)"
              : "var(--surface-2)",
          color: isRevealed ? "var(--text)" : "var(--text-muted)",
          opacity: isRevealed || isCurrent ? 1 : 0.55,
          boxShadow: hasWalker ? "0 0 0 2px var(--accent)" : undefined,
        }}
      >
        {hasWalker && (
          <span
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center animate-pulse"
            style={{ background: "var(--accent)" }}
          >
            <MapPin className="w-2.5 h-2.5" style={{ color: "var(--accent-foreground)" }} />
          </span>
        )}
        {isRevealed ? node.label : "?"}
      </div>
      {node.edgeLabel && depth > 0 && isRevealed && (
        <p className="text-[9px] mt-0.5 max-w-[7rem] text-center leading-tight" style={{ color: "var(--muted)" }}>
          {node.edgeLabel}
        </p>
      )}
      {node.children.length > 0 && (
        <div className="mt-3 flex flex-col items-center">
          <div className="w-[2px] h-3 rounded-full" style={{ background: "var(--border-strong)" }} />
          <div className="flex items-start gap-2 sm:gap-4">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-[2px] h-3 rounded-full" style={{ background: "var(--border-strong)" }} />
                <TreeNodeView
                  node={child}
                  revealed={revealed}
                  currentId={currentId}
                  walkerId={walkerId}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PathwayTreeExercise({
  mapId,
  map,
  onFocusNode,
}: {
  mapId: string;
  map: PharmaMap;
  onFocusNode: (nodeId: string) => void;
}) {
  const tree = useMemo(() => buildPathTree(map), [map]);
  const fillOrder = useMemo(() => (tree ? getFillOrder(tree) : []), [tree]);
  const walkOrder = useMemo(() => (tree ? getWalkOrder(tree) : []), [tree]);
  const labelPool = useMemo(() => map.nodes.map((n) => n.label_tr), [map]);

  const [mode, setMode] = useState<Mode>("idle");
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set(tree ? [tree.id] : []));
  const [walkerId, setWalkerId] = useState<string | null>(null);
  const [fillIdx, setFillIdx] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"ok" | "err" | null>(null);
  const [watchIdx, setWatchIdx] = useState(0);

  const reset = useCallback(() => {
    setMode("idle");
    setRevealed(new Set(tree ? [tree.id] : []));
    setWalkerId(null);
    setFillIdx(0);
    setOptions([]);
    setFeedback(null);
    setWatchIdx(0);
  }, [tree]);

  useEffect(() => {
    if (tree) setRevealed(new Set([tree.id]));
  }, [tree]);

  const startWatch = () => {
    if (!tree) return;
    nativeClient.impact();
    setMode("watch");
    setRevealed(new Set([tree.id]));
    setWalkerId(tree.id);
    setWatchIdx(0);
  };

  useEffect(() => {
    if (mode !== "watch" || !tree) return;
    if (watchIdx >= walkOrder.length) {
      const t = setTimeout(() => {
        setWalkerId(null);
        setMode("idle");
      }, 600);
      return () => clearTimeout(t);
    }
    const node = walkOrder[watchIdx];
    const t = setTimeout(() => {
      setRevealed((prev) => new Set([...prev, node.id]));
      setWalkerId(node.id);
      setWatchIdx((i) => i + 1);
    }, watchIdx === 0 ? 400 : 900);
    return () => clearTimeout(t);
  }, [mode, watchIdx, walkOrder, tree]);

  const startFill = () => {
    if (!tree || fillOrder.length === 0) return;
    nativeClient.impact();
    setMode("fill");
    setRevealed(new Set([tree.id]));
    setFillIdx(0);
    setWalkerId(fillOrder[0].id);
    setOptions(shuffleOptions(fillOrder[0].label, labelPool));
    setFeedback(null);
  };

  const currentFill = fillOrder[fillIdx];

  const pickOption = (label: string) => {
    if (!currentFill || feedback) return;
    nativeClient.impact();
    if (label === currentFill.label) {
      setFeedback("ok");
      setRevealed((prev) => new Set([...prev, currentFill.id]));
      const nextIdx = fillIdx + 1;
      if (nextIdx >= fillOrder.length) {
        setTimeout(() => {
          markPathTreeCompleted(mapId);
          setMode("done");
          setWalkerId(null);
        }, 700);
      } else {
        setTimeout(() => {
          setFillIdx(nextIdx);
          setWalkerId(fillOrder[nextIdx].id);
          setOptions(shuffleOptions(fillOrder[nextIdx].label, labelPool));
          setFeedback(null);
        }, 700);
      }
    } else {
      setFeedback("err");
      setTimeout(() => setFeedback(null), 1200);
    }
  };

  if (!tree || fillOrder.length < 2) return null;

  return (
    <section className="mt-10 max-w-2xl">
      <h2 className="text-lg font-semibold tracking-tight mb-1 flex items-center gap-2">
        <GitBranch className="w-5 h-5" /> Yolak yürüyüşü
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Kökten dallara inen yolu izle, geri dön, boşlukları doldur — topografik hafıza ile mekanizmayı yerleştir.
      </p>

      <div
        className="rounded-xl border p-4 sm:p-6 mb-4 overflow-x-auto"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <TreeNodeView
          node={tree}
          revealed={revealed}
          currentId={mode === "fill" ? currentFill?.id ?? null : null}
          walkerId={walkerId}
        />
      </div>

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startWatch}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg"
          >
            <Play className="w-4 h-4" /> Yolu izle
          </button>
          <button
            type="button"
            onClick={startFill}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg"
          >
            <MapPin className="w-4 h-4" /> Sen doldur
          </button>
        </div>
      )}

      {mode === "watch" && (
        <p className="text-xs flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Yolak boyunca ilerleniyor… ({Math.min(watchIdx, walkOrder.length)} / {walkOrder.length})
        </p>
      )}

      {mode === "fill" && currentFill && (
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            Durak {fillIdx + 1} / {fillOrder.length}
            {currentFill.edgeLabel && (
              <span className="block mt-1 font-normal" style={{ color: "var(--text-muted)" }}>
                İpucu: {currentFill.edgeLabel}
              </span>
            )}
          </p>
          <p className="text-sm font-medium">Bu düğümde ne var?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => pickOption(opt)}
                disabled={feedback === "ok"}
                className="text-left px-4 py-3 rounded-lg border text-sm transition-colors hover:opacity-90"
                style={{
                  borderColor: feedback === "err" && opt !== currentFill.label ? "var(--border)" : "var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {feedback === "ok" && (
            <p className="text-xs font-medium" style={{ color: "var(--success)" }}>Doğru — sonraki durağa geçiliyor…</p>
          )}
          {feedback === "err" && (
            <p className="text-xs font-medium" style={{ color: "var(--destructive)" }}>Tekrar dene.</p>
          )}
          <button
            type="button"
            onClick={() => onFocusNode(currentFill.id)}
            className="text-xs font-medium underline underline-offset-2"
            style={{ color: "var(--text-muted)" }}
          >
            Haritada göster
          </button>
        </div>
      )}

      {mode === "done" && (
        <div className="rounded-xl border p-6 text-center space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="font-semibold">Yolak tamamlandı</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Mekanizma yolunu baştan sona yerleştirdin. Mini quiz ile pekiştirmeye geçebilirsin.
          </p>
          <button type="button" onClick={reset} className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg">
            <RotateCcw className="w-4 h-4" /> Tekrar
          </button>
        </div>
      )}
    </section>
  );
}
