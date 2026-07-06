"use client";

import { useEffect, memo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Star } from "lucide-react";
import type { PharmaNodeType } from "@/lib/api";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  ntype: PharmaNodeType;
  highYield: boolean;
  dimmed: boolean;
  selected: boolean;
  isTarget: boolean;
}

const TYPE_ACCENT: Record<PharmaNodeType, string> = {
  mediator: "var(--foreground)",
  receptor: "var(--muted-strong)",
  organ: "var(--muted)",
  effect: "var(--border-strong)",
  drug_class: "var(--muted)",
};

function PharmaFlowNodeBase({ data }: NodeProps) {
  const d = data as FlowNodeData;
  const accent = TYPE_ACCENT[d.ntype] ?? "var(--foreground)";
  return (
    <div
      className="rounded-xl border shadow-sm transition-all"
      style={{
        background: "var(--surface)",
        borderColor: d.selected ? accent : "var(--border)",
        borderWidth: d.selected || d.isTarget ? 2 : 1,
        boxShadow: d.isTarget || d.selected ? `0 0 0 3px color-mix(in srgb, ${accent} 30%, transparent)` : undefined,
        opacity: d.dimmed ? 0.32 : 1,
        width: 180,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold leading-snug" style={{ color: "var(--text)" }}>
            {d.label}
          </span>
          {d.highYield && <Star className="w-3 h-3 shrink-0" style={{ color: "var(--foreground)", fill: "var(--foreground)" }} />}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

const PharmaFlowNode = memo(PharmaFlowNodeBase);

const nodeTypes = { pharma: PharmaFlowNode };

function FocusController({ focusNodeId }: { focusNodeId: string | null }) {
  const { getNode, setCenter } = useReactFlow();
  useEffect(() => {
    if (!focusNodeId) return;
    const node = getNode(focusNodeId);
    if (node) {
      const x = node.position.x + 90;
      const y = node.position.y + 24;
      setCenter(x, y, { zoom: 1.15, duration: 600 });
    }
  }, [focusNodeId, getNode, setCenter]);
  return null;
}

interface Props {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  onNodeClick: (nodeId: string) => void;
  focusNodeId: string | null;
}

export default function MapCanvas({ nodes, edges, onNodeClick, focusNodeId }: Props) {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background color="var(--border)" gap={20} />
        <Controls showInteractive={false} />
        <FocusController focusNodeId={focusNodeId} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
