import { Handle, Position, type NodeProps } from "@xyflow/react";

import { HANDLE_BOTTOM_OUT, HANDLE_TOP_IN } from "./constants";

export interface RoadmapCapstoneNodeData extends Record<string, unknown> {
  label: string;
  state: "default" | "selected";
}

const HANDLES = [
  { id: HANDLE_TOP_IN, type: "target", position: Position.Top },
  { id: HANDLE_BOTTOM_OUT, type: "source", position: Position.Bottom },
] as const;

/** Pointy-top regular hexagon matching CAPSTONE_NODE_WIDTH × CAPSTONE_NODE_HEIGHT. */
const HEX_POINTS = "88,2 174,39 174,113 88,150 2,113 2,39";

export function RoadmapCapstoneNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RoadmapCapstoneNodeData;
  const state = selected ? "selected" : nodeData.state;

  return (
    <div className={["roadmap__capstone", `roadmap__capstone--${state}`].join(" ")}>
      <svg
        className="roadmap__capstone-shape"
        viewBox="0 0 176 152"
        aria-hidden="true"
        focusable="false"
      >
        <polygon className="roadmap__capstone-polygon" points={HEX_POINTS} />
      </svg>

      {HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          className="roadmap__topic-handle"
          isConnectable={false}
        />
      ))}

      <span className="roadmap__node-label roadmap__capstone-label">{nodeData.label}</span>
    </div>
  );
}
