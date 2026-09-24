import { Handle, Position, type NodeProps } from "@xyflow/react";

import { HANDLE_BOTTOM_OUT, HANDLE_TOP_IN } from "./constants";

export type { RoadmapAnchorNodeData } from "./roadmap-node-data";
import type { RoadmapAnchorNodeData } from "./roadmap-node-data";

export function RoadmapAnchorNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapAnchorNodeData;

  return (
    <div className={`roadmap__anchor roadmap__anchor--${nodeData.variant}`}>
      {nodeData.variant === "end" ? (
        <Handle
          id={HANDLE_TOP_IN}
          type="target"
          position={Position.Top}
          className="roadmap__topic-handle"
          isConnectable={false}
        />
      ) : null}
      <span className="roadmap__node-label roadmap__anchor-label">{nodeData.label}</span>
      {nodeData.variant === "start" ? (
        <Handle
          id={HANDLE_BOTTOM_OUT}
          type="source"
          position={Position.Bottom}
          className="roadmap__topic-handle"
          isConnectable={false}
        />
      ) : null}
    </div>
  );
}
