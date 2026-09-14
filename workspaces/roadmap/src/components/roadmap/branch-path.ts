import { getBezierPath, Position, type InternalNode, type Node } from "@xyflow/react";

import {
  HANDLE_BOTTOM_OUT,
  HANDLE_LEFT_OUT,
  HANDLE_RIGHT_OUT,
} from "./constants";

export type BranchSide = "left" | "right" | "below";
export type BranchEdgeKind = "solo" | "trunk" | "leg";

export interface RoadmapBranchEdgeData extends Record<string, unknown> {
  branchKind: BranchEdgeKind;
  groupTargets?: string[];
}

export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SIDE_CURVATURE = 0.35;
const BUS_RATIO = 0.4;

export function branchSideFromHandle(sourceHandleId: string | null | undefined): BranchSide {
  if (sourceHandleId === HANDLE_BOTTOM_OUT) {
    return "below";
  }

  if (sourceHandleId === HANDLE_LEFT_OUT) {
    return "left";
  }

  return "right";
}

export function internalNodeBox(node: InternalNode<Node>): LayoutBox | undefined {
  const position = node.internals.positionAbsolute;
  if (position === undefined) {
    return undefined;
  }

  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  if (width <= 0 || height <= 0) {
    return undefined;
  }

  return {
    x: position.x,
    y: position.y,
    width,
    height,
  };
}

export function sharedBusX(
  sourceBox: LayoutBox,
  stackBoxes: LayoutBox[],
  side: BranchSide,
): number {
  const spineX = side === "right" ? sourceBox.x + sourceBox.width : sourceBox.x;
  const nearestTargetX =
    side === "right"
      ? Math.min(...stackBoxes.map((box) => box.x))
      : Math.max(...stackBoxes.map((box) => box.x + box.width));

  return spineX + (nearestTargetX - spineX) * BUS_RATIO;
}

export function belowBranchPath(sourceBox: LayoutBox, targetBox: LayoutBox): string {
  const [path] = getBezierPath({
    sourceX: sourceBox.x + sourceBox.width / 2,
    sourceY: sourceBox.y + sourceBox.height,
    targetX: targetBox.x + targetBox.width / 2,
    targetY: targetBox.y,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    curvature: 0.45,
  });

  return path;
}

export function sideBranchTrunkPath(
  sourceBox: LayoutBox,
  stackBoxes: LayoutBox[],
  side: BranchSide,
): string {
  if (stackBoxes.length === 0) {
    return "";
  }

  const bus = sharedBusX(sourceBox, stackBoxes, side);
  const spineX = side === "right" ? sourceBox.x + sourceBox.width : sourceBox.x;
  const spineCenterY = sourceBox.y + sourceBox.height / 2;
  const rowYs = stackBoxes.map((box) => box.y + box.height / 2);
  const topY = Math.min(...rowYs, spineCenterY);
  const bottomY = Math.max(...rowYs, spineCenterY);

  return `M ${spineX} ${spineCenterY} L ${bus} ${spineCenterY} M ${bus} ${topY} L ${bus} ${bottomY}`;
}

export function sideBranchLegPath(
  sourceBox: LayoutBox,
  targetBox: LayoutBox,
  stackBoxes: LayoutBox[],
  side: BranchSide,
): string {
  const bus = sharedBusX(sourceBox, stackBoxes, side);
  const rowY = targetBox.y + targetBox.height / 2;
  const targetX =
    side === "right" ? targetBox.x : targetBox.x + targetBox.width;

  const [path] = getBezierPath({
    sourceX: bus,
    sourceY: rowY,
    targetX: targetX,
    targetY: rowY,
    sourcePosition: side === "right" ? Position.Right : Position.Left,
    targetPosition: side === "right" ? Position.Left : Position.Right,
    curvature: SIDE_CURVATURE,
  });

  return path;
}

export function sideBranchSoloPath(
  sourceBox: LayoutBox,
  targetBox: LayoutBox,
  side: BranchSide,
): string {
  const stack = [targetBox];
  return `${sideBranchTrunkPath(sourceBox, stack, side)} ${sideBranchLegPath(sourceBox, targetBox, stack, side)}`;
}

export function branchEdgeData(
  branchKind: BranchEdgeKind,
  groupTargets?: string[],
): RoadmapBranchEdgeData {
  return groupTargets === undefined
    ? { branchKind }
    : { branchKind, groupTargets };
}
