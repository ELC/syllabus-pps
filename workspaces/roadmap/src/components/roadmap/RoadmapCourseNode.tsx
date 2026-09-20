import { isTrayectoNoEstructurado, type CourseTrayecto } from "@pps/core";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import {
  HANDLE_BOTTOM_OUT,
  HANDLE_LEFT_IN,
  HANDLE_LEFT_OUT,
  HANDLE_RIGHT_IN,
  HANDLE_RIGHT_OUT,
  HANDLE_TOP_IN,
} from "./constants";
import { courseLabelDensityClass, courseUsesDenseLabel } from "./course-label-style";
import { ROADMAP_STATUS_LABELS, useRoadmapProgressContext } from "./progress";
import type { RoadmapRole } from "./layout";

export interface RoadmapCourseNodeData extends Record<string, unknown> {
  label: string;
  year: string;
  role: RoadmapRole;
  stage: number;
  trayecto?: CourseTrayecto;
}

const HANDLES = [
  { id: HANDLE_TOP_IN, type: "target", position: Position.Top },
  { id: HANDLE_BOTTOM_OUT, type: "source", position: Position.Bottom },
  { id: HANDLE_LEFT_IN, type: "target", position: Position.Left },
  { id: HANDLE_LEFT_OUT, type: "source", position: Position.Left },
  { id: HANDLE_RIGHT_IN, type: "target", position: Position.Right },
  { id: HANDLE_RIGHT_OUT, type: "source", position: Position.Right },
] as const;

export function RoadmapCourseNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as RoadmapCourseNodeData;
  const progress = useRoadmapProgressContext();
  const isSpine = nodeData.role === "spine";
  const courseProgress = progress?.courseProgressFor(id) ?? {
    status: "pending" as const,
    done: 0,
    skipped: 0,
    total: 0,
    percent: 0,
  };
  const { status, percent, total } = courseProgress;
  const showProgressBar = total > 0 && status === "pending";
  const isTne = isTrayectoNoEstructurado(nodeData.trayecto);
  const labelDensity = courseLabelDensityClass(nodeData.label);
  const denseLabel = courseUsesDenseLabel(nodeData.label);

  return (
    <div
      className={[
        "roadmap__course",
        `roadmap__course--${nodeData.role}`,
        isSpine ? "roadmap__course--spine" : "",
        denseLabel ? "roadmap__course--dense-label" : "",
        isTne ? "roadmap__course--tne" : "",
        status !== "pending" ? `roadmap__course--${status}` : "",
        showProgressBar ? "roadmap__course--in-progress" : "",
      ].join(" ")}
      title={
        nodeData.year
          ? `${nodeData.label} · ${nodeData.year} · ${ROADMAP_STATUS_LABELS[status]}`
          : `${nodeData.label} · ${ROADMAP_STATUS_LABELS[status]}`
      }
      aria-label={`${nodeData.label}: ${ROADMAP_STATUS_LABELS[status]}`}
    >
      {showProgressBar ? (
        <div className="roadmap__course-progress" aria-hidden="true">
          <span className="roadmap__course-progress-fill" style={{ width: `${percent}%` }} />
        </div>
      ) : null}

      {HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          className="roadmap__course-handle"
          isConnectable={false}
        />
      ))}

      <span
        className={[
          "roadmap__node-label",
          "roadmap__course-label",
          isSpine ? "roadmap__course-label--spine" : "",
          status === "done" ? "roadmap__course-label--done" : "",
          labelDensity,
        ].join(" ")}
      >
        {nodeData.label}
      </span>
    </div>
  );
}
