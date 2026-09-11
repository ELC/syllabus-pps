import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface RoadmapAnchorNodeData extends Record<string, unknown> {
  label: string;
  variant: "start" | "end";
}

export function RoadmapAnchorNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapAnchorNodeData;

  return (
    <div className={`roadmap-anchor-node roadmap-anchor-node--${nodeData.variant}`}>
      {nodeData.variant === "end" ? (
        <Handle type="target" position={Position.Top} className="roadmap-topic-handle" />
      ) : null}
      <span className="roadmap-anchor-label">{nodeData.label}</span>
      {nodeData.variant === "start" ? (
        <Handle type="source" position={Position.Bottom} className="roadmap-topic-handle" />
      ) : null}
    </div>
  );
}
