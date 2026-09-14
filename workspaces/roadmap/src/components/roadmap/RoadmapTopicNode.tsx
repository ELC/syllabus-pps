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
        "roadmap__topic",
        `roadmap__topic--${nodeData.role}`,
        `roadmap__topic--${state}`,
        status !== "pending" ? `roadmap__topic--${status}` : "",
      ].join(" ")}
    >
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

      <button
        type="button"
        className={[
          "roadmap__topic-check",
          `roadmap__topic-check--${status}`,
          status === "done" ? "roadmap__topic-check--on-topic" : "",
          "nodrag",
          "nopan",
        ].join(" ")}
        aria-label={`${nodeData.label}: ${ROADMAP_STATUS_LABELS[status]}. Cambiar estado`}
        title={`${ROADMAP_STATUS_LABELS[status]} — tocá para cambiar`}
        onClick={(event) => {
          event.stopPropagation();
          progress?.cycle(id);
        }}
      >
        <span className="roadmap__topic-check-glyph" aria-hidden="true">
          {status === "done" ? "✓" : status === "skipped" ? "✕" : ""}
        </span>
      </button>

      <span
        ref={labelRef}
        className={[
          "roadmap__topic-label",
          isSpine ? "roadmap__topic-label--spine" : "",
          status === "done" ? "roadmap__topic-label--done" : "",
        ].join(" ")}
      >
        {nodeData.label}
      </span>

      {isSpine ? (
        <span className="roadmap__topic-stage" aria-label={`Etapa ${nodeData.stage}`}>
          {nodeData.stage}
        </span>
      ) : null}
    </div>
  );
}
