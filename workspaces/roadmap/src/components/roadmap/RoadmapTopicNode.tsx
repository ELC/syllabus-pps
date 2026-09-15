import { Handle, Position, type NodeProps } from "@xyflow/react";

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

export interface RoadmapTopicNodeData extends Record<string, unknown> {
  label: string;
  role: RoadmapRole;
  stage: number;
  state: "default";
}

const HANDLES = [
  { id: HANDLE_TOP_IN, type: "target", position: Position.Top },
  { id: HANDLE_BOTTOM_OUT, type: "source", position: Position.Bottom },
  { id: HANDLE_LEFT_IN, type: "target", position: Position.Left },
  { id: HANDLE_LEFT_OUT, type: "source", position: Position.Left },
  { id: HANDLE_RIGHT_IN, type: "target", position: Position.Right },
  { id: HANDLE_RIGHT_OUT, type: "source", position: Position.Right },
] as const;

export function RoadmapTopicNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as RoadmapTopicNodeData;
  const progress = useRoadmapProgressContext();
  const isSpine = nodeData.role === "spine";
  const conceptProgress = progress?.conceptProgressFor(id) ?? {
    status: "pending" as const,
    done: 0,
    skipped: 0,
    total: 0,
    percent: 0,
  };
  const { status, percent, total } = conceptProgress;
  const showProgressBar = total > 0 && status === "pending";

  return (
    <div
      className={[
        "roadmap__topic",
        `roadmap__topic--${nodeData.role}`,
        status !== "pending" ? `roadmap__topic--${status}` : "",
        showProgressBar ? "roadmap__topic--in-progress" : "",
      ].join(" ")}
      aria-label={`${nodeData.label}: ${ROADMAP_STATUS_LABELS[status]}`}
      title={ROADMAP_STATUS_LABELS[status]}
    >
      {showProgressBar ? (
        <div className="roadmap__topic-progress" aria-hidden="true">
          <span className="roadmap__topic-progress-fill" style={{ width: `${percent}%` }} />
        </div>
      ) : null}

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

      <span
        className={[
          "roadmap__node-label",
          "roadmap__topic-label",
          isSpine ? "roadmap__topic-label--spine" : "",
          status === "done" ? "roadmap__topic-label--done" : "",
        ].join(" ")}
      >
        {nodeData.label}
      </span>
    </div>
  );
}
