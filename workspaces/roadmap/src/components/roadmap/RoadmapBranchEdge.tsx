import { BaseEdge, useInternalNode, useStore, type EdgeProps } from "@xyflow/react";
import { useCallback } from "react";

import {
  belowBranchPath,
  branchSideFromHandle,
  internalNodeBox,
  sideBranchLegPath,
  sideBranchSoloPath,
  sideBranchTrunkPath,
  type LayoutBox,
  type RoadmapBranchEdgeData,
} from "./branch-path";

export type { RoadmapBranchEdgeData };

function useInternalNodeBoxes(ids: string[]): LayoutBox[] {
  const idKey = ids.join("\0");

  return useStore(
    useCallback(
      (state) => {
        const boxes: LayoutBox[] = [];

        for (const id of ids) {
          const internal = state.nodeLookup.get(id);
          if (internal === undefined) {
            continue;
          }

          const box = internalNodeBox(internal);
          if (box !== undefined) {
            boxes.push(box);
          }
        }

        return boxes;
      },
      [idKey],
    ),
  );
}

export function RoadmapBranchEdge({
  source,
  target,
  sourceHandleId,
  data,
  ...props
}: EdgeProps) {
  const branchData = data as RoadmapBranchEdgeData | undefined;
  const branchKind = branchData?.branchKind ?? "solo";
  const groupTargets = branchData?.groupTargets ?? [target];

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (sourceNode === undefined || targetNode === undefined) {
    return null;
  }

  const sourceBox = internalNodeBox(sourceNode);
  const targetBox = internalNodeBox(targetNode);
  const groupBoxes = useInternalNodeBoxes(groupTargets);

  if (
    sourceBox === undefined ||
    targetBox === undefined ||
    groupBoxes.length === 0
  ) {
    return null;
  }

  const side = branchSideFromHandle(sourceHandleId);
  let path: string;

  if (side === "below") {
    path = belowBranchPath(sourceBox, targetBox);
  } else if (branchKind === "trunk") {
    path = sideBranchTrunkPath(sourceBox, groupBoxes, side);
  } else if (branchKind === "leg") {
    path = sideBranchLegPath(sourceBox, targetBox, groupBoxes, side);
  } else {
    path = sideBranchSoloPath(sourceBox, targetBox, side);
  }

  if (path.length === 0) {
    return null;
  }

  return <BaseEdge {...props} path={path} />;
}
