import type { EdgeProps } from "@xyflow/react";

export function pickBaseEdgeProps({
  id,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
}: EdgeProps) {
  return {
    id,
    label,
    labelStyle,
    labelShowBg,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    style,
    markerStart,
    markerEnd,
    interactionWidth,
  };
}
