import type { DegreeRoadmap } from "@pps/core";
import type { Edge, Node } from "@xyflow/react";

import { capitalizeWords } from "../../scripts/labels";
import { collectUpstream, type RoadmapAdjacency } from "./adjacency";
import {
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  HANDLE_BOTTOM_OUT,
  HANDLE_JUNCTION_IN,
  HANDLE_JUNCTION_IN_LEFT,
  HANDLE_JUNCTION_IN_RIGHT,
  HANDLE_JUNCTION_OUT_BOTTOM,
  HANDLE_JUNCTION_OUT_LEFT,
  HANDLE_JUNCTION_OUT_RIGHT,
  HANDLE_LEFT_IN,
  HANDLE_LEFT_OUT,
  HANDLE_RIGHT_IN,
  HANDLE_RIGHT_OUT,
  HANDLE_TOP_IN,
  JUNCTION_RUNWAY_RATIO,
  ROADMAP_END_ID,
  ROADMAP_START_ID,
  STEP_EDGE_OFFSET,
} from "./constants";
import type { RoadmapLayout, RoadmapPlacement } from "./layout";
import type { RoadmapAnchorNodeData } from "./RoadmapAnchorNode";
import {
  branchEdgeData,
  branchSideFromHandle,
  type BranchEdgeKind,
  type BranchSide,
} from "./branch-path";
import type { RoadmapTopicNodeData } from "./RoadmapTopicNode";

interface BuildRoadmapFlowOptions {
  roadmap: DegreeRoadmap;
  adjacency: RoadmapAdjacency;
  layout: RoadmapLayout;
  focusTitle: string;
  isTopicDone: (title: string) => boolean;
}

function isRoadmapTopicId(id: string): boolean {
  return (
    id !== ROADMAP_START_ID &&
    id !== ROADMAP_END_ID &&
    !id.startsWith("__join__") &&
    !id.includes("::__branch-trunk__::")
  );
}

function edgeStyleSuffix(
  source: string,
  target: string,
  focusNeighborhood: Set<string>,
  isTopicDone: (title: string) => boolean,
): string {
  const topics = [source, target].filter(isRoadmapTopicId);
  let suffix = "";

  if (topics.some(isTopicDone)) {
    suffix += " roadmap__edge--done";
  }

  if (focusNeighborhood.has(source) && focusNeighborhood.has(target)) {
    suffix += " roadmap__edge--active";
  }

  return suffix;
}

function branchEdgeStyleSuffix(
  source: string,
  target: string,
  focusNeighborhood: Set<string>,
  isTopicDone: (title: string) => boolean,
  branchKind: BranchEdgeKind,
  groupTargets: string[],
): string {
  let suffix = "";

  if (branchKind === "trunk") {
    if (groupTargets.length > 0 && groupTargets.every(isTopicDone)) {
      suffix += " roadmap__edge--done";
    }
  } else if (isRoadmapTopicId(target) && isTopicDone(target)) {
    suffix += " roadmap__edge--done";
  }

  if (focusNeighborhood.has(source) && focusNeighborhood.has(target)) {
    suffix += " roadmap__edge--active";
  }

  return suffix;
}

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpineLink {
  source: string;
  target: string;
}

const ROADMAP_EDGE_PROPS = {
  focusable: false,
  interactionWidth: 0,
  selectable: false,
  type: "roadmapSpine",
  pathOptions: { borderRadius: 0, offset: STEP_EDGE_OFFSET },
} as const;

const ROADMAP_BRANCH_EDGE_PROPS = {
  focusable: ROADMAP_EDGE_PROPS.focusable,
  interactionWidth: ROADMAP_EDGE_PROPS.interactionWidth,
  selectable: ROADMAP_EDGE_PROPS.selectable,
  type: "roadmapBranch",
} as const;

interface StepElbow {
  centerX: number;
  centerY: number;
}

const JUNCTION_AXIS_EPSILON = 24;

function boxCenterX(box: LayoutBox): number {
  return box.x + box.width / 2;
}

function junctionRunwayCenterY(sourceBottom: number, targetTop?: number): number {
  const minimum = sourceBottom + STEP_EDGE_OFFSET;
  if (targetTop === undefined || targetTop <= sourceBottom + STEP_EDGE_OFFSET) {
    return minimum;
  }

  const gap = targetTop - sourceBottom;
  return sourceBottom + Math.max(STEP_EDGE_OFFSET, gap * JUNCTION_RUNWAY_RATIO);
}

function pickJunctionInHandle(junctionCenterX: number, sourceCenterX: number): string {
  const delta = sourceCenterX - junctionCenterX;
  if (Math.abs(delta) <= JUNCTION_AXIS_EPSILON) {
    return HANDLE_JUNCTION_IN;
  }

  return delta < 0 ? HANDLE_JUNCTION_IN_LEFT : HANDLE_JUNCTION_IN_RIGHT;
}

function pickJunctionOutHandle(junctionCenterX: number, targetCenterX: number): string {
  const delta = targetCenterX - junctionCenterX;
  if (Math.abs(delta) <= JUNCTION_AXIS_EPSILON) {
    return HANDLE_JUNCTION_OUT_BOTTOM;
  }

  return delta < 0 ? HANDLE_JUNCTION_OUT_LEFT : HANDLE_JUNCTION_OUT_RIGHT;
}

function spineEdgeProps(center?: StepElbow, straight = false) {
  if (straight) {
    return {
      focusable: ROADMAP_EDGE_PROPS.focusable,
      interactionWidth: ROADMAP_EDGE_PROPS.interactionWidth,
      selectable: ROADMAP_EDGE_PROPS.selectable,
      type: "straight",
    } as const;
  }

  if (center === undefined) {
    return ROADMAP_EDGE_PROPS;
  }

  return {
    ...ROADMAP_EDGE_PROPS,
    pathOptions: {
      ...ROADMAP_EDGE_PROPS.pathOptions,
      centerX: center.centerX,
      centerY: center.centerY,
    },
  };
}

function isSameSpineColumn(leftCenterX: number, rightCenterX: number): boolean {
  return Math.abs(leftCenterX - rightCenterX) <= JUNCTION_AXIS_EPSILON;
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

function spineAncestor(title: string, layout: RoadmapLayout): string | undefined {
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

function emitBranchEdges(
  layout: RoadmapLayout,
  edges: Edge[],
  styleSuffix: (
    source: string,
    target: string,
    branchKind: BranchEdgeKind,
    groupTargets: string[],
  ) => string,
): void {
  const grouped = new Map<
    string,
    { source: string; side: BranchSide; targets: string[] }
  >();

  for (const { source, target } of collectSpineBranchEdges(layout)) {
    const sourcePlacement = layout.placements.get(source);
    const targetPlacement = layout.placements.get(target);
    if (!sourcePlacement || !targetPlacement) {
      continue;
    }

    const handles = branchHandles(sourcePlacement, targetPlacement);
    const side = branchSideFromHandle(handles.sourceHandle);
    const key = `${source}:${side}`;
    const entry = grouped.get(key) ?? { source, side, targets: [] };
    entry.targets.push(target);
    grouped.set(key, entry);
  }

  const pushBranchEdge = (
    id: string,
    source: string,
    target: string,
    sourceHandle: string,
    targetHandle: string,
    data = branchEdgeData("solo"),
  ) => {
    edges.push({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      className: `roadmap__edge roadmap__edge--branch${styleSuffix(source, target, data.branchKind, data.groupTargets ?? [])}`,
      data,
      ...ROADMAP_BRANCH_EDGE_PROPS,
    });
  };

  for (const { source, side, targets } of grouped.values()) {
    const sourcePlacement = layout.placements.get(source);
    if (!sourcePlacement) {
      continue;
    }

    const targetPlacements = targets
      .map((title) => layout.placements.get(title))
      .filter((placement): placement is RoadmapPlacement => placement !== undefined);
    if (targetPlacements.length === 0) {
      continue;
    }

    const groupTargets = targetPlacements.map((placement) => placement.title);

    if (side === "below" || targetPlacements.length === 1) {
      for (const targetPlacement of targetPlacements) {
        const targetHandles = branchHandles(sourcePlacement, targetPlacement);
        pushBranchEdge(
          `${source}->${targetPlacement.title}`,
          source,
          targetPlacement.title,
          targetHandles.sourceHandle,
          targetHandles.targetHandle,
          branchEdgeData("solo", groupTargets),
        );
      }
      continue;
    }

    const trunkHandles = branchHandles(sourcePlacement, targetPlacements[0]!);
    pushBranchEdge(
      `${source}::__branch-trunk__::${side}`,
      source,
      targetPlacements[0]!.title,
      trunkHandles.sourceHandle,
      trunkHandles.targetHandle,
      branchEdgeData("trunk", groupTargets),
    );

    for (const targetPlacement of targetPlacements) {
      const targetHandles = branchHandles(sourcePlacement, targetPlacement);
      pushBranchEdge(
        `${source}->${targetPlacement.title}`,
        source,
        targetPlacement.title,
        targetHandles.sourceHandle,
        targetHandles.targetHandle,
        branchEdgeData("leg", groupTargets),
      );
    }
  }
}

function resolveNodeBox(id: string, layout: RoadmapLayout): LayoutBox | undefined {
  if (id === ROADMAP_START_ID) {
    return {
      x: layout.start.x,
      y: layout.start.y,
      width: ANCHOR_NODE_WIDTH,
      height: ANCHOR_NODE_HEIGHT,
    };
  }

  if (id === ROADMAP_END_ID) {
    return {
      x: layout.end.x,
      y: layout.end.y,
      width: ANCHOR_NODE_WIDTH,
      height: ANCHOR_NODE_HEIGHT,
    };
  }

  const placement = layout.placements.get(id);
  if (!placement) {
    return undefined;
  }

  return placement;
}

function spineLinkKey(link: SpineLink): string {
  return `${link.source}->${link.target}`;
}

function fanOutJunctionId(sourceId: string): string {
  return `__join__out__${sourceId}`;
}

function fanInJunctionId(targetId: string): string {
  return `__join__in__${targetId}`;
}

function junctionNode(id: string, centerX: number, centerY: number): Node {
  return {
    id,
    type: "roadmapJunction",
    position: { x: centerX, y: centerY },
    width: 1,
    height: 1,
    style: { width: 1, height: 1 },
    selectable: false,
    draggable: false,
    focusable: false,
    data: {},
  };
}

function emitSpineLinks(
  links: SpineLink[],
  layout: RoadmapLayout,
  adjacency: RoadmapAdjacency,
  nodes: Node[],
  edges: Edge[],
  activeSuffix: (source: string, target: string) => string,
): void {
  const remaining = [...links];
  const bySource = new Map<string, SpineLink[]>();
  const byTarget = new Map<string, SpineLink[]>();

  for (const link of remaining) {
    bySource.set(link.source, [...(bySource.get(link.source) ?? []), link]);
    byTarget.set(link.target, [...(byTarget.get(link.target) ?? []), link]);
  }

  const used = new Set<string>();

  const pushEdge = (
    source: string,
    target: string,
    sourceHandle: string,
    targetHandle: string,
    center?: StepElbow,
    straight = false,
  ) => {
    edges.push({
      id: `${source}->${target}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      className: `roadmap__edge roadmap__edge--spine${activeSuffix(source, target)}`,
      ...spineEdgeProps(center, straight),
    });
  };

  for (const [source, batch] of bySource) {
    const active = batch.filter((link) => !used.has(spineLinkKey(link)));
    if (active.length <= 1) {
      continue;
    }

    const sourceBox = resolveNodeBox(source, layout);
    if (!sourceBox) {
      continue;
    }

    const targetBoxes = active
      .map((link) => resolveNodeBox(link.target, layout))
      .filter((box): box is LayoutBox => box !== undefined);
    if (targetBoxes.length === 0) {
      continue;
    }

    const junctionId = fanOutJunctionId(source);
    const centerX = boxCenterX(sourceBox);
    const centerY = junctionRunwayCenterY(
      sourceBox.y + sourceBox.height,
      Math.min(...targetBoxes.map((box) => box.y)),
    );
    const elbow: StepElbow = { centerX, centerY };
    nodes.push(junctionNode(junctionId, centerX, centerY));
    pushEdge(
      source,
      junctionId,
      HANDLE_BOTTOM_OUT,
      HANDLE_JUNCTION_IN,
      elbow,
      isSameSpineColumn(centerX, centerX),
    );

    for (const link of active) {
      const targetBox = resolveNodeBox(link.target, layout);
      if (!targetBox) {
        continue;
      }

      const targetCenterX = targetBox.x + targetBox.width / 2;
      const outHandle = pickJunctionOutHandle(centerX, targetCenterX);
      pushEdge(
        junctionId,
        link.target,
        outHandle,
        HANDLE_TOP_IN,
        elbow,
        outHandle === HANDLE_JUNCTION_OUT_BOTTOM,
      );
      used.add(spineLinkKey(link));
    }
  }

  for (const [target, batch] of byTarget) {
    const active = batch.filter((link) => !used.has(spineLinkKey(link)));
    if (active.length <= 1) {
      continue;
    }

    const targetBox = resolveNodeBox(target, layout);
    if (!targetBox) {
      continue;
    }

    const sourceBoxes = active
      .map((link) => resolveNodeBox(link.source, layout))
      .filter((box): box is LayoutBox => box !== undefined);
    if (sourceBoxes.length === 0) {
      continue;
    }

    const junctionId = fanInJunctionId(target);
    const sourceBottom = Math.max(...sourceBoxes.map((box) => box.y + box.height));
    const centerX =
      sourceBoxes.reduce((sum, box) => sum + boxCenterX(box), 0) / sourceBoxes.length;
    const centerY = junctionRunwayCenterY(sourceBottom, targetBox.y);
    const elbow: StepElbow = { centerX, centerY };
    nodes.push(junctionNode(junctionId, centerX, centerY));

    for (const link of active) {
      const sourceBox = resolveNodeBox(link.source, layout);
      if (!sourceBox) {
        continue;
      }

      const sourceCenterX = sourceBox.x + sourceBox.width / 2;
      const inHandle = pickJunctionInHandle(centerX, sourceCenterX);
      pushEdge(
        link.source,
        junctionId,
        HANDLE_BOTTOM_OUT,
        inHandle,
        elbow,
        inHandle === HANDLE_JUNCTION_IN,
      );
      used.add(spineLinkKey(link));
    }

    pushEdge(
      junctionId,
      target,
      HANDLE_JUNCTION_OUT_BOTTOM,
      HANDLE_TOP_IN,
      elbow,
      isSameSpineColumn(centerX, targetBox.x + targetBox.width / 2),
    );
  }

  for (const link of remaining) {
    if (used.has(spineLinkKey(link))) {
      continue;
    }

    pushEdge(link.source, link.target, HANDLE_BOTTOM_OUT, HANDLE_TOP_IN);
    used.add(spineLinkKey(link));
  }
}

export function buildRoadmapFlow({
  roadmap,
  adjacency,
  layout,
  focusTitle,
  isTopicDone,
}: BuildRoadmapFlowOptions): { nodes: Node[]; edges: Edge[] } {
  const upstream = focusTitle
    ? collectUpstream(adjacency.prerequisites, focusTitle)
    : new Set<string>();
  const focusNeighborhood = new Set<string>(focusTitle ? [focusTitle, ...upstream] : []);
  const styleSuffix = (source: string, target: string) =>
    edgeStyleSuffix(source, target, focusNeighborhood, isTopicDone);

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
  const spineLinks: SpineLink[] = [];

  const queueSpineLink = (source: string, target: string) => {
    const sourcePlacement =
      source === ROADMAP_START_ID || source === ROADMAP_END_ID
        ? ({ role: "spine" } as RoadmapPlacement)
        : layout.placements.get(source);
    const targetPlacement =
      target === ROADMAP_START_ID || target === ROADMAP_END_ID
        ? ({ role: "spine" } as RoadmapPlacement)
        : layout.placements.get(target);

    if (!isSpineNode(source, sourcePlacement) || !isSpineNode(target, targetPlacement)) {
      return;
    }

    spineLinks.push({ source, target });
  };

  for (const lane of layout.parallelLanes) {
    const first = lane[0];
    if (first !== undefined) {
      queueSpineLink(ROADMAP_START_ID, first);
    }

    for (let index = 0; index < lane.length - 1; index += 1) {
      const source = lane[index];
      const target = lane[index + 1];
      if (source === undefined || target === undefined) {
        continue;
      }
      queueSpineLink(source, target);
    }
  }

  const mergeTarget = layout.trunk[0];
  const lateJoinFrom = new Set(layout.lateJoins.map((join) => join.from));
  if (mergeTarget !== undefined) {
    for (const lane of layout.parallelLanes) {
      const last = lane[lane.length - 1];
      if (last !== undefined && !lateJoinFrom.has(last)) {
        queueSpineLink(last, mergeTarget);
      }
    }
  }

  for (const { from, to } of layout.lateJoins) {
    queueSpineLink(from, to);
  }

  const trunkForkPairs = new Set(
    layout.trunkForks.map((fork) => `${fork.after}->${fork.mergeInto}`),
  );

  for (const fork of layout.trunkForks) {
    for (const lane of fork.lanes) {
      const first = lane[0];
      if (first !== undefined) {
        queueSpineLink(fork.after, first);
      }

      for (let index = 0; index < lane.length - 1; index += 1) {
        const source = lane[index];
        const target = lane[index + 1];
        if (source === undefined || target === undefined) {
          continue;
        }
        queueSpineLink(source, target);
      }

      const last = lane[lane.length - 1];
      if (last !== undefined) {
        queueSpineLink(last, fork.mergeInto);
      }
    }
  }

  const mergedSpine =
    layout.parallelLanes.length > 0 ? layout.trunk : [ROADMAP_START_ID, ...layout.trunk];

  for (let index = 0; index < mergedSpine.length - 1; index += 1) {
    const source = mergedSpine[index];
    const target = mergedSpine[index + 1];
    if (source === undefined || target === undefined) {
      continue;
    }
    if (trunkForkPairs.has(`${source}->${target}`)) {
      continue;
    }
    queueSpineLink(source, target);
  }

  const trunkTail = layout.trunk[layout.trunk.length - 1];
  if (trunkTail !== undefined) {
    queueSpineLink(trunkTail, ROADMAP_END_ID);
  } else if (layout.parallelLanes.length > 0) {
    for (const lane of layout.parallelLanes) {
      const last = lane[lane.length - 1];
      if (last !== undefined) {
        queueSpineLink(last, ROADMAP_END_ID);
      }
    }
  }

  emitSpineLinks(spineLinks, layout, adjacency, nodes, edges, styleSuffix);
  emitBranchEdges(layout, edges, (source, target, branchKind, groupTargets) =>
    branchEdgeStyleSuffix(
      source,
      target,
      focusNeighborhood,
      isTopicDone,
      branchKind,
      groupTargets,
    ),
  );

  return { nodes, edges };
}
