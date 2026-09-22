import {
  BaseEdge,
  getBezierPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

import { pickBaseEdgeProps } from "./pick-base-edge-props";

export function RoadmapCourseEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    pathOptions,
  } = props;

  const curvature = pathOptions?.curvature ?? 0.45;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature,
  });

  return (
    <BaseEdge {...pickBaseEdgeProps(props)} path={path} labelX={labelX} labelY={labelY} />
  );
}
