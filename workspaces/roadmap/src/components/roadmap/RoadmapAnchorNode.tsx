import { Handle, Position, type NodeProps } from "@xyflow/react";

import { HANDLE_BOTTOM_OUT, HANDLE_TOP_IN } from "./constants";

export interface RoadmapAnchorNodeData extends Record<string, unknown> {
  label: string;
  variant: "start" | "end";
}

export function RoadmapAnchorNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapAnchorNodeData;

  return (
    <div className={`roadmap-anchor-node roadmap-anchor-node--${nodeData.variant}`}>
      {nodeData.variant === "end" ? (
        <Handle
          id={HANDLE_TOP_IN}
          type="target"
          position={Position.Top}
          className="roadmap-topic-handle"
          isConnectable={false}
        />
      ) : null}
      <span className="roadmap-anchor-label">{nodeData.label}</span>
      {nodeData.variant === "start" ? (
        <Handle
          id={HANDLE_BOTTOM_OUT}
          type="source"
          position={Position.Bottom}
          className="roadmap-topic-handle"
          isConnectable={false}
        />
      ) : null}
    </div>
  );
}
