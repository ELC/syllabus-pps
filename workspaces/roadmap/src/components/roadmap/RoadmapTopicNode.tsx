import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRef } from "react";

import {
  HANDLE_BOTTOM_OUT,
  HANDLE_LEFT_IN,
  HANDLE_LEFT_OUT,
  HANDLE_RIGHT_IN,
  HANDLE_RIGHT_OUT,
  HANDLE_TOP_IN,
} from "./constants";
import { ROADMAP_STATUS_LABELS, useRoadmapProgressContext } from "./progress";
import type { RoadmapRole } from "./layout";
import { useTwoLineLabelFontSize } from "./useTwoLineLabel";

export interface RoadmapTopicNodeData extends Record<string, unknown> {
  label: string;
  role: RoadmapRole;
  stage: number;
  state: "default" | "selected" | "prerequisite";
}

const HANDLES = [
  { id: HANDLE_TOP_IN, type: "target", position: Position.Top },
  { id: HANDLE_BOTTOM_OUT, type: "source", position: Position.Bottom },
  { id: HANDLE_LEFT_IN, type: "target", position: Position.Left },
  { id: HANDLE_LEFT_OUT, type: "source", position: Position.Left },
  { id: HANDLE_RIGHT_IN, type: "target", position: Position.Right },
  { id: HANDLE_RIGHT_OUT, type: "source", position: Position.Right },
] as const;

const SPINE_LABEL_MAX_REM = 1.05;
const SPINE_LABEL_MIN_REM = 0.68;
const BRANCH_LABEL_MAX_REM = 0.92;
const BRANCH_LABEL_MIN_REM = 0.58;

export function RoadmapTopicNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as RoadmapTopicNodeData;
  const progress = useRoadmapProgressContext();
  const isSpine = nodeData.role === "spine";
  const status = progress?.statusFor(id) ?? "pending";
  const state = selected ? "selected" : nodeData.state;
  const labelRef = useRef<HTMLSpanElement>(null);

  useTwoLineLabelFontSize(labelRef, {
    maxRem: isSpine ? SPINE_LABEL_MAX_REM : BRANCH_LABEL_MAX_REM,
    minRem: isSpine ? SPINE_LABEL_MIN_REM : BRANCH_LABEL_MIN_REM,
    text: nodeData.label,
  });

  return (
    <div
      className={[
        "roadmap-topic-node",
        `roadmap-topic-node--${nodeData.role}`,
        `roadmap-topic-node--${state}`,
        `is-${status}`,
      ].join(" ")}
    >
      {HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          className="roadmap-topic-handle"
          isConnectable={false}
        />
      ))}

      <button
        type="button"
        className={`roadmap-topic-check roadmap-topic-check--${status} nodrag nopan`}
        aria-label={`${nodeData.label}: ${ROADMAP_STATUS_LABELS[status]}. Cambiar estado`}
        title={`${ROADMAP_STATUS_LABELS[status]} — tocá para cambiar`}
        onClick={(event) => {
          event.stopPropagation();
          progress?.cycle(id);
        }}
      >
        <span className="roadmap-topic-check-glyph" aria-hidden="true" />
      </button>

      <span ref={labelRef} className="roadmap-topic-label">
        {nodeData.label}
      </span>

      {isSpine ? (
        <span className="roadmap-topic-stage" aria-label={`Etapa ${nodeData.stage}`}>
          {nodeData.stage}
        </span>
      ) : null}
    </div>
  );
}
