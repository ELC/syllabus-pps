import {
  BaseEdge,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

export function RoadmapSpineEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  pathOptions,
  ...props
}: EdgeProps) {
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

  return <BaseEdge {...props} path={path} labelX={labelX} labelY={labelY} />;
}
