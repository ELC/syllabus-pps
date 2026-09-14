import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

import {
  HANDLE_JUNCTION_IN,
  HANDLE_JUNCTION_IN_LEFT,
  HANDLE_JUNCTION_IN_RIGHT,
  HANDLE_JUNCTION_OUT_BOTTOM,
  HANDLE_JUNCTION_OUT_LEFT,
  HANDLE_JUNCTION_OUT_RIGHT,
} from "./constants";

const CENTER_HANDLE_STYLE: CSSProperties = {
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
};

const JUNCTION_HANDLES = [
  { id: HANDLE_JUNCTION_IN, type: "target", position: Position.Top },
  { id: HANDLE_JUNCTION_IN_LEFT, type: "target", position: Position.Left },
  { id: HANDLE_JUNCTION_IN_RIGHT, type: "target", position: Position.Right },
  { id: HANDLE_JUNCTION_OUT_LEFT, type: "source", position: Position.Left },
  { id: HANDLE_JUNCTION_OUT_RIGHT, type: "source", position: Position.Right },
  { id: HANDLE_JUNCTION_OUT_BOTTOM, type: "source", position: Position.Bottom },
] as const;

export function RoadmapJunctionNode(_props: NodeProps) {
  return (
    <div className="roadmap__junction" aria-hidden="true">
      {JUNCTION_HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          className="roadmap__junction-handle"
          style={CENTER_HANDLE_STYLE}
          isConnectable={false}
        />
      ))}
    </div>
  );
}
