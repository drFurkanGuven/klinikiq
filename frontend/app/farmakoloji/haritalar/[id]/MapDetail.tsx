"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { isAuthenticated, logout } from "@/lib/auth";
import {
  pharmaApi,
  type PharmaMap,
  type PharmaIntervention,
  type PharmaNodeType,
  type PharmaNode,
} from "@/lib/api";
import { markMapVisited, markQuizCompleted, ensurePharmaProgressHydrated } from "@/lib/pharmaProgress";
import { PathwayTreeExercise } from "@/components/pharma/PathwayTreeExercise";
import { ThemeToggle } from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  LogOut,
  Waypoints,
  Loader2,
  Star,
  X,
  Pill,
  HelpCircle,
  Info,
  Lightbulb,
  Zap,
} from "lucide-react";
import type { FlowNodeData } from "./MapCanvas";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  ),
});

const COL_X: Record<PharmaNodeType, number> = {
  mediator: 0,
  receptor: 250,
  organ: 500,
  effect: 750,
  drug_class: 0,
};
const ROW_H = 84;

const TYPE_LABEL: Record<PharmaNodeType, string> = {
  mediator: "Nörotransmitter",
  receptor: "Reseptör",
  organ: "Organ / doku",
  effect: "Klinik etki",
  drug_class: "İlaç sınıfı",
};

function relationColor(relation: string): string {
  return relation === "antagonist" || relation === "inhibits" ? "var(--muted)" : "var(--foreground)";
}

export default function MapDetail({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");

  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<PharmaMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetailTab, setNodeDetailTab] = useState<"overview" | "mechanism">("overview");
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace(`/login?next=/farmakoloji/haritalar/${id}`);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await ensurePharmaProgressHydrated();
        const res = await pharmaApi.getMap(id);
        setMap(res.data);
        markMapVisited(id);
      } catch {
        setError("Harita yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, router, id]);

  // Deep link: ?focus=<node_id> geldiğinde ilgili düğümü seç ve odakla
  useEffect(() => {
    if (!map || !focusParam) return;
    const exists = map.nodes.some((n) => n.id === focusParam);
    if (exists) {
      setSelectedNodeId(focusParam);
      setFocusNodeId(focusParam);
    }
  }, [map, focusParam]);

  const intervention = useMemo<PharmaIntervention | null>(
    () => map?.interventions.find((i) => i.drug_class === selectedDrug) ?? null,
    [map, selectedDrug],
  );

  // İlaç seçiliyken vurgulanacak düğüm kümesi (hedefler + aşağı yönlü etkiler)
  const activeNodeIds = useMemo(() => {
    if (!intervention) return null;
    const s = new Set<string>(intervention.targets);
    intervention.downstream_effects.forEach((d) => s.add(d.nodeId));
    return s;
  }, [intervention]);

  const targetIds = useMemo(
    () => new Set<string>(intervention?.targets ?? []),
    [intervention],
  );

  const rfNodes = useMemo<Node<FlowNodeData>[]>(() => {
    if (!map) return [];
    const counters: Partial<Record<PharmaNodeType, number>> = {};
    return map.nodes.map((n) => {
      const idx = counters[n.type] ?? 0;
      counters[n.type] = idx + 1;
      const dimmed = activeNodeIds ? !activeNodeIds.has(n.id) : false;
      return {
        id: n.id,
        type: "pharma",
        position: { x: COL_X[n.type] ?? 0, y: idx * ROW_H },
        data: {
          label: n.label_tr,
          ntype: n.type,
          highYield: n.high_yield,
          dimmed,
          selected: selectedNodeId === n.id,
          isTarget: targetIds.has(n.id),
        },
        draggable: false,
      };
    });
  }, [map, activeNodeIds, selectedNodeId, targetIds]);

  const rfEdges = useMemo<Edge[]>(() => {
    if (!map) return [];
    return map.edges.map((e, i) => {
      const highlighted = activeNodeIds
        ? activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
        : false;
      const color = relationColor(e.relation);
      const dim = activeNodeIds ? !highlighted : false;
      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: highlighted ? e.effect_tr : undefined,
        animated: highlighted,
        style: {
          stroke: color,
          strokeWidth: highlighted ? 2.5 : 1.5,
          opacity: dim ? 0.15 : 0.75,
          strokeDasharray: e.relation === "antagonist" || e.relation === "inhibits" ? "5 4" : undefined,
        },
        labelStyle: { fill: "var(--text)", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "var(--surface)", opacity: 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      };
    });
  }, [map, activeNodeIds]);

  const selectedNode = useMemo(
    () => map?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [map, selectedNodeId],
  );

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setNodeDetailTab("overview");
  };

  const focusOnMap = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/farmakoloji/haritalar"
              className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
              aria-label="Haritalar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
                <Waypoints className="w-5 h-5" style={{ color: "var(--accent-foreground)" }} />
              </div>
              <div className="min-w-0">
                <span className="font-black text-base sm:text-lg tracking-tight block leading-tight truncate">
                  {map?.title_tr ?? "Mantık Haritası"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Farmakoloji · İnteraktif</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button type="button" onClick={logout} className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5" style={{ color: "var(--text-muted)" }}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border px-5 py-4 text-sm font-medium" style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--error-light)" }}>
            {error}
          </div>
        )}

        {map && !loading && (
          <>
            <p className="text-sm sm:text-base font-medium leading-relaxed mb-6 max-w-3xl" style={{ color: "var(--text-muted)" }}>
              {map.description_tr}
            </p>

            {/* İlaç sınıfı seçici (L2) */}
            <div className="mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <Pill className="w-3.5 h-3.5" /> İlaç sınıfı seç — hedef reseptör ve etkileri vurgula
              </h2>
              <div className="flex flex-wrap gap-2">
                {map.interventions.map((iv) => {
                  const active = selectedDrug === iv.drug_class;
                  return (
                    <button
                      key={iv.drug_class}
                      type="button"
                      onClick={() => setSelectedDrug(active ? null : iv.drug_class)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                      style={
                        active
                          ? { background: "var(--accent)", color: "var(--accent-foreground)", borderColor: "var(--accent)" }
                          : { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" }
                      }
                    >
                      {iv.label_tr}
                    </button>
                  );
                })}
                {selectedDrug && (
                  <button
                    type="button"
                    onClick={() => setSelectedDrug(null)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1"
                    style={{ background: "var(--surface)", color: "var(--text-muted)", borderColor: "var(--border)" }}
                  >
                    <X className="w-3.5 h-3.5" /> Temizle
                  </button>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              {/* Harita */}
              <div
                ref={mapSectionRef}
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--surface)", borderColor: "var(--border)", height: "min(70vh, 620px)" }}
              >
                <MapCanvas
                  nodes={rfNodes}
                  edges={rfEdges}
                  onNodeClick={handleNodeClick}
                  focusNodeId={focusNodeId}
                />
              </div>

              {/* Yan panel */}
              <aside className="space-y-4">
                {/* İlaç detay paneli */}
                {intervention && (
                  <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--primary)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <h3 className="font-black text-sm">{intervention.label_tr}</h3>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                      Aşağı yönlü etkiler
                    </p>
                    <ul className="space-y-1 mb-3">
                      {intervention.downstream_effects.map((d) => (
                        <li key={d.nodeId} className="text-sm flex gap-2" style={{ color: "var(--text)" }}>
                          <span style={{ color: "var(--primary)" }}>→</span>
                          {d.effect_tr}
                        </li>
                      ))}
                    </ul>
                    {intervention.tr_products_atc.length > 0 && (
                      <>
                        <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                          Türkiye&apos;deki ürünler (ATC)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {intervention.tr_products_atc.map((atc) => (
                            <span
                              key={atc}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono font-bold border"
                              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                              title="ATC kodu (TİTCK sınıflandırması)"
                            >
                              {atc}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Düğüm detay paneli */}
                <NodeDetailPanel
                  node={selectedNode}
                  tab={nodeDetailTab}
                  onTabChange={setNodeDetailTab}
                  onClose={() => setSelectedNodeId(null)}
                />

                {/* Renk açıklaması */}
                <div className="rounded-2xl border p-4 text-xs" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <p className="font-black uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Gösterim</p>
                  <ul className="space-y-1.5" style={{ color: "var(--text-muted)" }}>
                    <li className="flex items-center gap-2"><span className="w-6 h-0.5 rounded" style={{ background: "var(--foreground)" }} /> Uyarı / agonist</li>
                    <li className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed" style={{ borderColor: "var(--muted)" }} /> İnhibisyon / antagonist</li>
                    <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5" style={{ color: "var(--foreground)", fill: "var(--foreground)" }} /> Yüksek verimli konu</li>
                  </ul>
                </div>
              </aside>
            </div>

            <PathwayTreeExercise mapId={id} map={map} onFocusNode={focusOnMap} />

            {/* Quiz */}
            <QuizSection mapId={id} map={map} onFocusNode={focusOnMap} />

            {/* Attribution */}
            <div
              className="mt-8 rounded-2xl border px-5 py-4 text-xs font-medium leading-relaxed"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <strong style={{ color: "var(--text)" }}>Kaynak & lisans:</strong> {map.source_attribution}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ── Düğüm detay paneli (genel + mekanizma sekmesi) ─────────────────
function NodeDetailPanel({
  node,
  tab,
  onTabChange,
  onClose,
}: {
  node: PharmaNode | null | undefined;
  tab: "overview" | "mechanism";
  onTabChange: (t: "overview" | "mechanism") => void;
  onClose: () => void;
}) {
  const hasMechanism = node?.signaling && (node.signaling.pathway || node.signaling.second_messenger || node.signaling.clinical_hook_tr);

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {!node ? (
        <div className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          Haritadaki bir düğüme tıklayın; açıklama, mekanizma ve akılda kalıcı ipucu burada görünecek.
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-semibold text-base leading-snug">{node.label_tr}</h3>
              {node.high_yield && <Star className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)", fill: "var(--foreground)" }} />}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 opacity-50 hover:opacity-100" aria-label="Kapat">
              <X className="w-4 h-4" />
            </button>
          </div>
          <span
            className="inline-block text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full mb-3"
            style={{ background: "var(--surface-hover)", color: "var(--foreground)" }}
          >
            {TYPE_LABEL[node.type]}
          </span>

          <div className="flex gap-1 p-0.5 rounded-lg mb-3 border" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
            {(["overview", "mechanism"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTabChange(t)}
                className="flex-1 text-xs font-medium py-1.5 rounded-md transition-all"
                style={
                  tab === t
                    ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                    : { color: "var(--muted)" }
                }
              >
                {t === "overview" ? "Genel" : "Mekanizma"}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {node.description_tr}
              </p>
              {node.memory_hook_tr && (
                <div className="mt-3 rounded-lg border p-3 text-xs flex gap-2" style={{ borderColor: "var(--border)", background: "var(--surface-hover)" }}>
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--foreground)" }} />
                  <div>
                    <span className="font-semibold block mb-0.5">Akılda kalsın</span>
                    {node.memory_hook_tr}
                  </div>
                </div>
              )}
              {node.high_yield && (
                <div className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border-strong)", background: "var(--surface-hover)" }}>
                  <span className="font-semibold">High-yield: </span>
                  Bu kavram TUS&apos;ta sık sorulur.
                </div>
              )}
            </>
          )}

          {tab === "mechanism" && (
            hasMechanism ? (
              <dl className="space-y-2 text-sm">
                {node.signaling?.pathway && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "var(--muted)" }}>Sinyal yolu</dt>
                    <dd>{node.signaling.pathway}</dd>
                  </div>
                )}
                {node.signaling?.second_messenger && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "var(--muted)" }}>İkinci haberci</dt>
                    <dd>{node.signaling.second_messenger}</dd>
                  </div>
                )}
                {node.signaling?.clinical_hook_tr && (
                  <div className="rounded-lg border p-3 mt-2" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
                    <dt className="text-xs font-medium flex items-center gap-1 mb-1" style={{ color: "var(--muted)" }}>
                      <Zap className="w-3.5 h-3.5" /> Klinik bağlantı
                    </dt>
                    <dd className="text-sm leading-relaxed">{node.signaling.clinical_hook_tr}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Bu düğüm için ayrıntılı mekanizma notu henüz eklenmedi. Genel sekmesindeki açıklamaya bakın.
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────
function QuizSection({
  mapId,
  map,
  onFocusNode,
}: {
  mapId: string;
  map: PharmaMap;
  onFocusNode: (nodeId: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const quiz = map.quiz;
  const letters = ["A", "B", "C", "D", "E"];

  if (quiz.length === 0) return null;

  const q = quiz[idx];

  const select = (i: number) => {
    if (answered) return;
    setAnswered(true);
    setSelected(i);
    if (i === q.answer_idx) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= quiz.length) {
      const pct = Math.round((score / quiz.length) * 100);
      markQuizCompleted(mapId, pct);
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setAnswered(false);
    setSelected(null);
  };

  const restart = () => {
    setIdx(0);
    setAnswered(false);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  return (
    <section className="mt-10 max-w-2xl">
      <h2 className="text-lg font-black tracking-tight mb-1 flex items-center gap-2">
        <HelpCircle className="w-5 h-5" style={{ color: "var(--primary)" }} /> Mini quiz
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Haritadaki mantığı ölç — klinik ve mekanizma soruları.
      </p>

      {!done ? (
        <div className="rounded-2xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(idx / quiz.length) * 100}%`, background: "var(--primary)" }} />
          </div>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>Soru {idx + 1} / {quiz.length}</p>
          <p className="font-bold mb-4">{q.q_tr}</p>
          <div className="space-y-2 mb-4">
            {q.options_tr.map((opt, i) => {
              let cls = "w-full text-left px-3 sm:px-4 py-3 rounded-lg border text-sm transition-all flex items-start gap-3 ";
              let style: React.CSSProperties = { background: "var(--bg-subtle)", borderColor: "var(--border)" };
              if (answered) {
                if (i === q.answer_idx) style = { background: "var(--success-light)", borderColor: "var(--success)", color: "var(--success)" };
                else if (i === selected) style = { background: "var(--error-light)", borderColor: "var(--danger)", color: "var(--danger)" };
                else style.opacity = 0.5;
              } else {
                cls += "hover:border-[var(--primary)] cursor-pointer";
              }
              return (
                <button key={i} className={cls} style={style} onClick={() => select(i)} disabled={answered}>
                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0" style={{ borderColor: "currentColor" }}>
                    {letters[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="p-4 rounded-lg text-sm mb-4" style={{ background: "var(--primary-light)", borderLeft: "3px solid var(--primary)" }}>
              <p className="font-semibold mb-1" style={{ color: "var(--primary)" }}>Açıklama</p>
              <p style={{ color: "var(--text)" }}>{q.explanation_tr}</p>
              {q.node_id && (
                <button
                  type="button"
                  onClick={() => onFocusNode(q.node_id as string)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all hover:bg-black/5"
                  style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                >
                  <Waypoints className="w-3.5 h-3.5" /> Bu mantığı haritada gör
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Puan: <span style={{ color: "var(--primary)", fontWeight: 600 }}>{score}</span> / {idx}
            </span>
            {answered && (
              <button onClick={next} className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                {idx + 1 < quiz.length ? "Sonraki →" : "Sonucu Gör →"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-5xl font-black mb-2" style={{ color: score / quiz.length >= 0.7 ? "var(--success)" : "var(--warning)" }}>
            {Math.round((score / quiz.length) * 100)}%
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{score} / {quiz.length} doğru</p>
          <button onClick={restart} className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
            Tekrar Başla
          </button>
        </div>
      )}
    </section>
  );
}
