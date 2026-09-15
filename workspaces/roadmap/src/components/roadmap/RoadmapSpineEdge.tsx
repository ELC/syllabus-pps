import {
  BaseEdge,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

import { pickBaseEdgeProps } from "./pick-base-edge-props";

export function RoadmapSpineEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    pathOptions,
  } = props;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: pathOptions?.borderRadius ?? 0,
    offset: pathOptions?.offset,
    centerX: pathOptions?.centerX,
    centerY: pathOptions?.centerY,
    stepPosition: pathOptions?.stepPosition,
  });

  return (
    <BaseEdge {...pickBaseEdgeProps(props)} path={path} labelX={labelX} labelY={labelY} />
  );
}
