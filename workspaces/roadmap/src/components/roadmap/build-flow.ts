import type {
  DegreeRoadmap,
  DegreeRoadmapAdjacency,
  DegreeRoadmapNodeTitle,
} from "@pps/core";
import type { Edge, Node } from "@xyflow/react";

import { capitalizeWords } from "../../scripts/labels";
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
import { COURSE_YEAR_LABEL_GUTTER } from "./course-layout";
import type { CourseYearBand, RoadmapLayout, RoadmapPlacement } from "./layout";
import type {
  RoadmapAnchorNodeData,
  RoadmapCourseNodeData,
  RoadmapTopicNodeData,
  RoadmapYearBandNodeData,
} from "./roadmap-node-data";
import {
  branchEdgeData,
  branchSideFromHandle,
  type BranchEdgeKind,
  type BranchSide,
} from "./branch-path";

interface BuildRoadmapFlowOptions {
  roadmap: DegreeRoadmap;
  adjacency: DegreeRoadmapAdjacency;
  layout: RoadmapLayout;
  isTopicDone: (title: DegreeRoadmapNodeTitle) => boolean;
  topicNodeType?: "roadmapTopic" | "roadmapCourse";
  courseYearsByTitle?: Map<DegreeRoadmapNodeTitle, string>;
  courseTrayectoByTitle?: Map<DegreeRoadmapNodeTitle, string>;
  /** Draw correlativa prerequisite edges directly between staged course nodes. */
  courseDagEdges?: boolean;
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
  isTopicDone: (title: string) => boolean,
): string {
  const topics = [source, target].filter(isRoadmapTopicId);

  if (topics.some(isTopicDone)) {
    return " roadmap__edge--done";
  }

  return "";
}

function branchEdgeStyleSuffix(
  target: string,
  isTopicDone: (title: string) => boolean,
  branchKind: BranchEdgeKind,
  groupTargets: string[],
): string {
  if (branchKind === "trunk") {
    if (groupTargets.length > 0 && groupTargets.every(isTopicDone)) {
      return " roadmap__edge--done";
    }

    return "";
  }

  if (isRoadmapTopicId(target) && isTopicDone(target)) {
    return " roadmap__edge--done";
  }

  return "";
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

function isJunctionId(id: string): boolean {
  return id.startsWith("__join__");
}

function boxCenterX(box: LayoutBox): number {
  return box.x + box.width / 2;
}

function boxCenterY(box: LayoutBox): number {
  return box.y + box.height / 2;
}

function junctionRunwayCenterY(
  sourceBottom: number,
  targetTop?: number,
  ratio: number = JUNCTION_RUNWAY_RATIO,
): number {
  const minimum = sourceBottom + STEP_EDGE_OFFSET;
  if (targetTop === undefined || targetTop <= sourceBottom + STEP_EDGE_OFFSET) {
    return minimum;
  }

  const gap = targetTop - sourceBottom;
  return sourceBottom + Math.max(STEP_EDGE_OFFSET, gap * ratio);
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
  options: Pick<
    BuildRoadmapFlowOptions,
    "topicNodeType" | "courseYearsByTitle" | "courseTrayectoByTitle"
  >,
): Node<RoadmapTopicNodeData | RoadmapCourseNodeData> {
  const nodeType = options.topicNodeType ?? "roadmapTopic";

  if (nodeType === "roadmapCourse") {
    return {
      id: placement.title,
      type: "roadmapCourse",
      position: { x: placement.x, y: placement.y },
      width: placement.width,
      height: placement.height,
      style: { width: placement.width, height: placement.height },
      data: {
        label: capitalizeWords(placement.title),
        year: options.courseYearsByTitle?.get(placement.title) ?? "",
        trayecto: options.courseTrayectoByTitle?.get(placement.title),
        role: placement.role,
        stage: placement.stage + 1,
      },
    } as Node<RoadmapCourseNodeData>;
  }

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

function resolvePlacement(layout: RoadmapLayout, id: string): RoadmapPlacement | undefined {
  return layout.placements.get(id);
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

const COURSE_DAG_ALIGNED_X_THRESHOLD = 12;
const COURSE_DAG_SAME_BAND_Y_THRESHOLD = 16;
const COURSE_DAG_CROSS_YEAR_CURVATURE = 0.52;
const COURSE_DAG_SAME_BAND_CURVATURE = 0.38;
const COURSE_DAG_VERTICAL_CURVATURE = 0.44;

function nodeCenterX(layout: RoadmapLayout, nodeId: string): number | undefined {
  const box = resolveNodeBox(nodeId, layout);
  return box ? boxCenterX(box) : undefined;
}

function nodeCenterY(layout: RoadmapLayout, nodeId: string): number | undefined {
  const box = resolveNodeBox(nodeId, layout);
  return box ? boxCenterY(box) : undefined;
}

function pickCourseDagHandles(
  layout: RoadmapLayout,
  source: string,
  target: string,
): { sourceHandle: string; targetHandle: string } {
  const sourceBox = resolveNodeBox(source, layout);
  const targetBox = resolveNodeBox(target, layout);
  if (!sourceBox || !targetBox) {
    return { sourceHandle: HANDLE_BOTTOM_OUT, targetHandle: HANDLE_TOP_IN };
  }

  const sameBand = Math.abs(sourceBox.y - targetBox.y) <= COURSE_DAG_SAME_BAND_Y_THRESHOLD;
  if (!sameBand) {
    return { sourceHandle: HANDLE_BOTTOM_OUT, targetHandle: HANDLE_TOP_IN };
  }

  const deltaX = Math.abs(boxCenterX(sourceBox) - boxCenterX(targetBox));
  if (deltaX <= COURSE_DAG_ALIGNED_X_THRESHOLD) {
    return { sourceHandle: HANDLE_BOTTOM_OUT, targetHandle: HANDLE_TOP_IN };
  }

  if (boxCenterX(sourceBox) < boxCenterX(targetBox)) {
    return { sourceHandle: HANDLE_RIGHT_OUT, targetHandle: HANDLE_LEFT_IN };
  }

  return { sourceHandle: HANDLE_LEFT_OUT, targetHandle: HANDLE_RIGHT_IN };
}

function courseDagBezierOptions(
  layout: RoadmapLayout,
  link: SpineLink,
  handles: { sourceHandle: string; targetHandle: string },
): { curvature: number } {
  const sourceX = nodeCenterX(layout, link.source);
  const targetX = nodeCenterX(layout, link.target);
  const sourceY = nodeCenterY(layout, link.source);
  const targetY = nodeCenterY(layout, link.target);

  const horizontalEdge =
    handles.sourceHandle === HANDLE_RIGHT_OUT || handles.sourceHandle === HANDLE_LEFT_OUT;

  if (horizontalEdge) {
    return { curvature: COURSE_DAG_SAME_BAND_CURVATURE };
  }

  if (
    sourceX === undefined ||
    targetX === undefined ||
    sourceY === undefined ||
    targetY === undefined
  ) {
    return { curvature: COURSE_DAG_VERTICAL_CURVATURE };
  }

  const deltaX = Math.abs(sourceX - targetX);
  if (deltaX <= COURSE_DAG_ALIGNED_X_THRESHOLD) {
    return { curvature: COURSE_DAG_VERTICAL_CURVATURE };
  }

  return { curvature: COURSE_DAG_CROSS_YEAR_CURVATURE };
}

const YEAR_BAND_MARGIN_TOP = 20;
const YEAR_BAND_MARGIN_BOTTOM = 28;
const YEAR_SEPARATOR_LINE_HEIGHT = 3;

function yearBandNode(
  band: CourseYearBand,
  minNodeX: number,
  maxNodeX: number,
  options: { previousBandMaxY?: number },
): Node<RoadmapYearBandNodeData> {
  const x = minNodeX - COURSE_YEAR_LABEL_GUTTER;
  let y = band.y - YEAR_BAND_MARGIN_TOP;
  let height = band.height + YEAR_BAND_MARGIN_TOP + YEAR_BAND_MARGIN_BOTTOM;
  let separatorTop = 0;
  let showYearSeparator = false;

  if (options.previousBandMaxY !== undefined) {
    const gapMidY =
      (options.previousBandMaxY + band.y) / 2 - YEAR_SEPARATOR_LINE_HEIGHT / 2;
    separatorTop = gapMidY - y;
    showYearSeparator = true;
    if (separatorTop < 0) {
      y += separatorTop;
      height -= separatorTop;
      separatorTop = 0;
    }
  }

  return {
    id: `__year-band__${band.year}`,
    type: "roadmapYearBand",
    position: { x, y },
    width: Math.max(maxNodeX - x + 32, COURSE_YEAR_LABEL_GUTTER - 24),
    height,
    selectable: false,
    draggable: false,
    focusable: false,
    zIndex: -1,
    data: { label: band.year, separatorTop, showYearSeparator },
  };
}

function emitCourseDagLinks(
  links: SpineLink[],
  layout: RoadmapLayout,
  edges: Edge[],
  activeSuffix: (source: string, target: string) => string,
): void {
  for (const link of links) {
    const handles = pickCourseDagHandles(layout, link.source, link.target);
    edges.push({
      id: `${link.source}->${link.target}`,
      source: link.source,
      target: link.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      className: `roadmap__edge roadmap__edge--spine roadmap__edge--course-dag${activeSuffix(link.source, link.target)}`,
      focusable: false,
      interactionWidth: 0,
      selectable: false,
      type: "roadmapCourse",
      pathOptions: courseDagBezierOptions(layout, link, handles),
    } as Edge);
  }
}

function spineLinkKey(link: SpineLink): string {
  return `${link.source}->${link.target}`;
}

function emitLinearSpineEdges(
  links: SpineLink[],
  edges: Edge[],
  activeSuffix: (source: string, target: string) => string,
): void {
  for (const link of links) {
    edges.push({
      id: `${link.source}->${link.target}`,
      source: link.source,
      target: link.target,
      sourceHandle: HANDLE_BOTTOM_OUT,
      targetHandle: HANDLE_TOP_IN,
      className: `roadmap__edge roadmap__edge--spine${activeSuffix(link.source, link.target)}`,
      ...spineEdgeProps(undefined, true),
    });
  }
}

function queueLinearConceptSpineLinks(
  layout: RoadmapLayout,
  queueSpineLink: (source: string, target: string) => void,
): void {
  const { trunk } = layout;
  const first = trunk[0];
  if (first !== undefined) {
    queueSpineLink(ROADMAP_START_ID, first);
  }
  for (let index = 0; index < trunk.length - 1; index += 1) {
    const source = trunk[index];
    const target = trunk[index + 1];
    if (source !== undefined && target !== undefined) {
      queueSpineLink(source, target);
    }
  }
  const tail = trunk[trunk.length - 1];
  if (tail !== undefined) {
    queueSpineLink(tail, ROADMAP_END_ID);
  }
}

export function buildRoadmapFlow({
  roadmap,
  adjacency,
  layout,
  isTopicDone,
  topicNodeType,
  courseYearsByTitle,
  courseTrayectoByTitle,
  courseDagEdges = false,
}: BuildRoadmapFlowOptions): { nodes: Node[]; edges: Edge[] } {
  const topicNodeOptions = { topicNodeType, courseYearsByTitle, courseTrayectoByTitle };
  const styleSuffix = (source: string, target: string) =>
    edgeStyleSuffix(source, target, isTopicDone);

  const nodes: Node[] = [
    anchorNode(ROADMAP_START_ID, "start", "Inicio", layout.start),
    anchorNode(ROADMAP_END_ID, "end", "Objetivo", layout.end),
  ];

  if (courseDagEdges && layout.courseYearBands) {
    const placementExtents = [...layout.placements.values()];
    const minNodeX = Math.min(
      ...placementExtents.map((placement) => placement.x),
      layout.start.x,
    );
    const maxNodeX = Math.max(
      ...placementExtents.map((placement) => placement.x + placement.width),
      layout.end.x + ANCHOR_NODE_WIDTH,
    );
    for (const [index, band] of layout.courseYearBands.entries()) {
      const previousBand = index > 0 ? layout.courseYearBands[index - 1] : undefined;
      nodes.push(
        yearBandNode(band, minNodeX, maxNodeX, {
          previousBandMaxY: previousBand
            ? previousBand.y + previousBand.height
            : undefined,
        }),
      );
    }
  }

  for (const concept of roadmap.concepts) {
    const placement = layout.placements.get(concept.title);
    if (!placement || (placement.role !== "spine" && placement.role !== "branch")) {
      continue;
    }

    nodes.push(topicNode(placement, "default", topicNodeOptions));
  }

  const edges: Edge[] = [];
  const spineLinks: SpineLink[] = [];
  const queuedSpineLinkKeys = new Set<string>();

  const queueSpineLink = (source: string, target: string) => {
    const sourceIsJunction = isJunctionId(source);
    const targetIsJunction = isJunctionId(target);
    const sourcePlacement =
      source === ROADMAP_START_ID || source === ROADMAP_END_ID
        ? ({ role: "spine" } as RoadmapPlacement)
        : resolvePlacement(layout, source);
    const targetPlacement =
      target === ROADMAP_START_ID || target === ROADMAP_END_ID
        ? ({ role: "spine" } as RoadmapPlacement)
        : resolvePlacement(layout, target);

    if (
      (!sourceIsJunction && !isSpineNode(source, sourcePlacement)) ||
      (!targetIsJunction && !isSpineNode(target, targetPlacement))
    ) {
      return;
    }

    const key = spineLinkKey({ source, target });
    if (queuedSpineLinkKeys.has(key)) {
      return;
    }

    queuedSpineLinkKeys.add(key);
    spineLinks.push({ source, target });
  };

  if (courseDagEdges) {
    for (const course of roadmap.concepts) {
      for (const prerequisite of adjacency.prerequisites.get(course.title) ?? []) {
        queueSpineLink(prerequisite, course.title);
      }
    }

    emitCourseDagLinks(spineLinks, layout, edges, styleSuffix);
    return { nodes, edges };
  }

  queueLinearConceptSpineLinks(layout, queueSpineLink);
  emitLinearSpineEdges(spineLinks, edges, styleSuffix);
  emitBranchEdges(layout, edges, (_source, target, branchKind, groupTargets) =>
    branchEdgeStyleSuffix(target, isTopicDone, branchKind, groupTargets),
  );

  return { nodes, edges };
}
