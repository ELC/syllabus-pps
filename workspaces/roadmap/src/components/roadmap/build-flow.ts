import type { DegreeRoadmap } from "@pps/core";
import type { Edge, Node } from "@xyflow/react";

import { capitalizeWords } from "../../scripts/labels";
import { collectUpstream, type RoadmapAdjacency } from "./adjacency";
import {
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  HANDLE_BOTTOM_OUT,
  HANDLE_LEFT_IN,
  HANDLE_LEFT_OUT,
  HANDLE_RIGHT_IN,
  HANDLE_RIGHT_OUT,
  HANDLE_TOP_IN,
  ROADMAP_END_ID,
  ROADMAP_START_ID,
} from "./constants";
import type { RoadmapLayout, RoadmapPlacement } from "./layout";
import type { RoadmapAnchorNodeData } from "./RoadmapAnchorNode";
import type { RoadmapTopicNodeData } from "./RoadmapTopicNode";

interface BuildRoadmapFlowOptions {
  roadmap: DegreeRoadmap;
  adjacency: RoadmapAdjacency;
  layout: RoadmapLayout;
  focusTitle: string;
}

function topicNode(
  placement: RoadmapPlacement,
  state: RoadmapTopicNodeData["state"],
): Node<RoadmapTopicNodeData> {
  return {
    id: placement.title,
    type: "roadmapTopic",
    position: { x: placement.x, y: placement.y },
    width: placement.width,
    height: placement.height,
    style: { width: placement.width, height: placement.height },
    data: {
      label: capitalizeWords(placement.title),
      role: placement.role,
      stage: placement.stage + 1,
      state,
    },
  };
}

function anchorNode(
  id: string,
  variant: RoadmapAnchorNodeData["variant"],
  label: string,
  position: { x: number; y: number },
): Node<RoadmapAnchorNodeData> {
  return {
    id,
    type: "roadmapAnchor",
    position,
    width: ANCHOR_NODE_WIDTH,
    height: ANCHOR_NODE_HEIGHT,
    style: { width: ANCHOR_NODE_WIDTH, height: ANCHOR_NODE_HEIGHT },
    selectable: false,
    data: { label, variant },
  };
}

function sideHandles(
  source: RoadmapPlacement,
  target: RoadmapPlacement,
): { sourceHandle: string; targetHandle: string } {
  return target.x >= source.x
    ? { sourceHandle: HANDLE_RIGHT_OUT, targetHandle: HANDLE_LEFT_IN }
    : { sourceHandle: HANDLE_LEFT_OUT, targetHandle: HANDLE_RIGHT_IN };
}

function isSpineNode(title: string, placement: RoadmapPlacement | undefined): boolean {
  return (
    title === ROADMAP_START_ID ||
    title === ROADMAP_END_ID ||
    placement?.role === "spine"
  );
}

function spineAncestor(
  title: string,
  layout: RoadmapLayout,
): string | undefined {
  const placement = layout.placements.get(title);
  if (isSpineNode(title, placement)) {
    return title;
  }

  for (const [owner, terminals] of layout.attached) {
    if (!terminals.includes(title)) {
      continue;
    }

    return spineAncestor(owner, layout);
  }

  return undefined;
}

function collectSpineBranchEdges(
  layout: RoadmapLayout,
): Array<{ source: string; target: string }> {
  const branchEdges: Array<{ source: string; target: string }> = [];
  const referenced = new Set<string>();

  for (const [owner, terminals] of layout.attached) {
    for (const terminal of terminals) {
      if (referenced.has(terminal)) {
        continue;
      }

      const source = spineAncestor(owner, layout);
      const sourcePlacement = source ? layout.placements.get(source) : undefined;
      const targetPlacement = layout.placements.get(terminal);

      if (
        source === undefined ||
        !isSpineNode(source, sourcePlacement) ||
        targetPlacement?.role !== "branch"
      ) {
        continue;
      }

      referenced.add(terminal);
      branchEdges.push({ source, target: terminal });
    }
  }

  return branchEdges;
}

function branchHandles(
  source: RoadmapPlacement,
  target: RoadmapPlacement,
): { sourceHandle: string; targetHandle: string } {
  const sourceCenter = source.x + source.width / 2;
  const targetCenter = target.x + target.width / 2;

  if (
    Math.abs(targetCenter - sourceCenter) <= 24 &&
    target.y >= source.y + source.height - 4
  ) {
    return { sourceHandle: HANDLE_BOTTOM_OUT, targetHandle: HANDLE_TOP_IN };
  }

  return sideHandles(source, target);
}

export function buildRoadmapFlow({
  roadmap,
  adjacency,
  layout,
  focusTitle,
}: BuildRoadmapFlowOptions): { nodes: Node[]; edges: Edge[] } {
  const upstream = focusTitle
    ? collectUpstream(adjacency.prerequisites, focusTitle)
    : new Set<string>();
  const focusNeighborhood = new Set<string>(focusTitle ? [focusTitle, ...upstream] : []);

  const nodes: Node[] = [
    anchorNode(ROADMAP_START_ID, "start", "Inicio", layout.start),
    anchorNode(ROADMAP_END_ID, "end", "Objetivo", layout.end),
  ];

  for (const concept of roadmap.concepts) {
    const placement = layout.placements.get(concept.title);
    if (!placement) {
      continue;
    }

    nodes.push(
      topicNode(
        placement,
        concept.title === focusTitle
          ? "selected"
          : upstream.has(concept.title)
            ? "prerequisite"
            : "default",
      ),
    );
  }

  const edges: Edge[] = [];

  const activeSuffix = (source: string, target: string) =>
    focusNeighborhood.has(source) && focusNeighborhood.has(target)
      ? " roadmap-edge--active"
      : "";

  const spineEdge = (source: string, target: string) => {
    const sourcePlacement = layout.placements.get(source);
    const targetPlacement = layout.placements.get(target);

    if (!isSpineNode(source, sourcePlacement) || !isSpineNode(target, targetPlacement)) {
      return;
    }

    const dependency = adjacency.prerequisites.get(target)?.has(source) ?? false;

    edges.push({
      id: `${source}->${target}`,
      source,
      target,
      sourceHandle: HANDLE_BOTTOM_OUT,
      targetHandle: HANDLE_TOP_IN,
      type: "straight",
      className: `roadmap-edge roadmap-edge--${dependency ? "trunk" : "sequence"}${activeSuffix(source, target)}`,
    });
  };

  for (const lane of layout.parallelLanes) {
    const first = lane[0];
    if (first !== undefined) {
      spineEdge(ROADMAP_START_ID, first);
    }

    for (let index = 0; index < lane.length - 1; index += 1) {
      const source = lane[index];
      const target = lane[index + 1];
      if (source === undefined || target === undefined) {
        continue;
      }
      spineEdge(source, target);
    }
  }

  const mergeTarget = layout.trunk[0];
  const lateJoinFrom = new Set(layout.lateJoins.map((join) => join.from));
  if (mergeTarget !== undefined) {
    for (const lane of layout.parallelLanes) {
      const last = lane[lane.length - 1];
      if (last !== undefined && !lateJoinFrom.has(last)) {
        spineEdge(last, mergeTarget);
      }
    }
  }

  for (const { from, to } of layout.lateJoins) {
    spineEdge(from, to);
  }

  const mergedSpine =
    layout.parallelLanes.length > 0 ? layout.trunk : [ROADMAP_START_ID, ...layout.trunk];

  for (let index = 0; index < mergedSpine.length - 1; index += 1) {
    const source = mergedSpine[index];
    const target = mergedSpine[index + 1];
    if (source === undefined || target === undefined) {
      continue;
    }
    spineEdge(source, target);
  }

  const trunkTail = layout.trunk[layout.trunk.length - 1];
  if (trunkTail !== undefined) {
    spineEdge(trunkTail, ROADMAP_END_ID);
  } else if (layout.parallelLanes.length > 0) {
    for (const lane of layout.parallelLanes) {
      const last = lane[lane.length - 1];
      if (last !== undefined) {
        spineEdge(last, ROADMAP_END_ID);
      }
    }
  }

  for (const { source, target } of collectSpineBranchEdges(layout)) {
    const sourcePlacement = layout.placements.get(source);
    const targetPlacement = layout.placements.get(target);
    if (!sourcePlacement || !targetPlacement) {
      continue;
    }

    edges.push({
      id: `${source}->${target}`,
      source,
      target,
      ...branchHandles(sourcePlacement, targetPlacement),
      type: "default",
      className: `roadmap-edge roadmap-edge--branch${activeSuffix(source, target)}`,
    });
  }

  return { nodes, edges };
}
