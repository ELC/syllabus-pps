import type { DegreeRoadmap } from "@pps/core";
import type { Edge, Node } from "@xyflow/react";

import { capitalizeWords } from "../../scripts/labels";
import type { RoadmapAdjacency } from "./adjacency";
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
import type { RoadmapYearBandNodeData } from "./RoadmapYearBandNode";
import type { RoadmapAnchorNodeData } from "./RoadmapAnchorNode";
import {
  branchEdgeData,
  branchSideFromHandle,
  type BranchEdgeKind,
  type BranchSide,
} from "./branch-path";
import type { RoadmapCourseNodeData } from "./RoadmapCourseNode";
import type { RoadmapTopicNodeData } from "./RoadmapTopicNode";

interface BuildRoadmapFlowOptions {
  roadmap: DegreeRoadmap;
  adjacency: RoadmapAdjacency;
  layout: RoadmapLayout;
  isTopicDone: (title: string) => boolean;
  topicNodeType?: "roadmapTopic" | "roadmapCourse";
  courseYearsByTitle?: Map<string, string>;
  courseTrayectoByTitle?: Map<string, string>;
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

function spineLinkKey(link: SpineLink): string {
  return `${link.source}->${link.target}`;
}

/** Single parallel lane mirroring the trunk column (course concept map after fork edits). */
function primaryTrunkParallelLane(layout: RoadmapLayout): string[] | null {
  if (layout.parallelLanes.length !== 1 || layout.trunk.length === 0) {
    return null;
  }

  const lane = layout.parallelLanes[0]!;
  if (lane.length === 0 || lane[0] !== layout.trunk[0]) {
    return null;
  }

  const trunkTitles = new Set(layout.trunk);
  if (!lane.every((title) => trunkTitles.has(title))) {
    return null;
  }

  return lane;
}

/** Inicio head fork: anchor is only in fork lanes, not on the trunk column. */
function inicioHeadFork(
  fork: { after: string; lanes: string[][] },
  trunk: readonly string[],
): boolean {
  return fork.after === trunk[0] && fork.lanes.flat().includes(fork.after);
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

function tailParallelPairFork(
  fork: { after: string; mergeInto: string; lanes: string[][] },
  trunk: readonly string[],
): boolean {
  if (!fork.lanes.flat().includes(fork.after)) {
    return false;
  }

  const afterIdx = trunk.indexOf(fork.after);
  const mergeIdx = trunk.indexOf(fork.mergeInto);
  if (afterIdx < 0 || mergeIdx !== trunk.length - 1) {
    return false;
  }

  return (
    fork.lanes.length > 1 &&
    fork.lanes.every((lane) => lane.length === 1) &&
    fork.lanes.some((lane) => lane[0] === fork.mergeInto)
  );
}

/** Tail opens after an upstream merge anchor duplicated in a lane (ACID|trans after ACID). */
function tailParallelForkAnchorInLane(
  fork: { after: string; mergeInto: string; lanes: string[][] },
  trunk: readonly string[],
  trunkForks: readonly { after: string; mergeInto: string; lanes: string[][] }[],
): boolean {
  if (!tailParallelPairFork(fork, trunk)) {
    return false;
  }

  if (trunkForks.some((other) => other !== fork && other.mergeInto === fork.after)) {
    return true;
  }

  return !trunkForks.some((other) => other !== fork && other.mergeInto === fork.mergeInto);
}

function sharedTrunkMergeTarget(
  layout: RoadmapLayout,
  mergeInto: string,
): boolean {
  return layout.trunkForks.filter((fork) => fork.mergeInto === mergeInto).length >= 2;
}

/** Center-spine step into the next fork anchor — not a sql fan-out arm. */
function trunkContinuationToForkAnchor(
  layout: RoadmapLayout,
  source: string,
  target: string,
): boolean {
  const sourceIdx = layout.trunk.indexOf(source);
  const targetIdx = layout.trunk.indexOf(target);
  if (sourceIdx < 0 || targetIdx !== sourceIdx + 1) {
    return false;
  }

  if (!layout.trunkForks.some((fork) => fork.after === target)) {
    return false;
  }

  return layout.trunkForks.some(
    (entry) => entry.mergeInto === source && entry.after !== source,
  );
}

/** Upstream fork merges at `after`, then a tail fork opens there with the anchor duplicated in a lane. */
function adjacentTailMergeJoinSplitAtAnchor(
  layout: RoadmapLayout,
  fork: { after: string; mergeInto: string; lanes: string[][] },
): boolean {
  const mergeJoinAnchor = layout.trunkForks.some(
    (entry) => entry.mergeInto === fork.after && entry.after !== fork.after,
  );
  if (
    !mergeJoinAnchor ||
    !fork.lanes.flat().includes(fork.after) ||
    fork.lanes.flat().length === 0
  ) {
    return false;
  }

  const afterIdx = layout.trunk.indexOf(fork.after);
  const mergeIdx = layout.trunk.indexOf(fork.mergeInto);
  const tailTitle = layout.trunk[layout.trunk.length - 1];
  const parallelTailPair = fork.lanes.every(
    (lane) =>
      lane.length === 1 &&
      (lane[0] === fork.after || lane[0] === fork.mergeInto),
  );
  return (
    afterIdx >= 0 &&
    mergeIdx === afterIdx + 1 &&
    tailTitle !== undefined &&
    fork.mergeInto === tailTitle &&
    parallelTailPair
  );
}

function parallelTailLaneRootMergeForkAtMergeInto(
  layout: RoadmapLayout,
  mergeInto: string,
): (typeof layout.trunkForks)[number] | undefined {
  if (sharedTrunkMergeTarget(layout, mergeInto)) {
    return undefined;
  }

  const tailTitle = layout.trunk[layout.trunk.length - 1];
  return layout.trunkForks.find(
    (fork) =>
      fork.mergeInto === mergeInto &&
      mergeInto === tailTitle &&
      fork.lanes.length > 1 &&
      fork.lanes.every((lane) => lane.length === 1) &&
      fork.lanes.some((lane) => lane[0] === fork.mergeInto),
  );
}

function tailParallelMergeForkAtMergeInto(
  layout: RoadmapLayout,
  mergeInto: string,
): (typeof layout.trunkForks)[number] | undefined {
  const fork = parallelTailLaneRootMergeForkAtMergeInto(layout, mergeInto);
  if (fork === undefined) {
    return undefined;
  }
  return fork;
}

/** Upstream merge at `after`, then a multi-lane fork opens with the anchor duplicated in a lane. */
function mergeJoinThenSplitFanInAt(
  layout: RoadmapLayout,
  mergeSpineTitle: string,
): boolean {
  const fork = layout.trunkForks.find((entry) => entry.after === mergeSpineTitle);
  if (fork === undefined || fork.lanes.length < 2) {
    return false;
  }

  const mergeJoinAnchor = layout.trunkForks.some(
    (entry) => entry.mergeInto === fork.after && entry.after !== fork.after,
  );
  return mergeJoinAnchor && fork.lanes.flat().includes(fork.after);
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

  const virtualJunctionBoxes = new Map<string, LayoutBox>();
  const resolveBox = (id: string): LayoutBox | undefined =>
    virtualJunctionBoxes.get(id) ?? resolveNodeBox(id, layout);

  // A fan-in target that will also spawn a fan-out at the same trunk position
  // (mergeJoinThenSplit) gets its fan-in biased toward the source so the
  // subsequent fan-out has room below it. Without this bias the fan-in sits
  // at the midpoint of an enlarged gap, making the previous fork visually
  // taller than the follow-up one.
  const stackedFanOutSources = new Set<string>();
  for (const source of bySource.keys()) {
    if (source.startsWith("__join__in__")) {
      stackedFanOutSources.add(source);
    }
  }

  for (const [target, batch] of byTarget) {
    if (batch.length <= 1) {
      continue;
    }

    const targetBox = resolveNodeBox(target, layout);
    if (!targetBox) {
      continue;
    }

    const sourceBoxes = batch
      .map((link) => resolveNodeBox(link.source, layout))
      .filter((box): box is LayoutBox => box !== undefined);
    if (sourceBoxes.length === 0) {
      continue;
    }

    const sourceBottom = Math.max(...sourceBoxes.map((box) => box.y + box.height));
    const spanCenters = [
      ...sourceBoxes.map((box) => boxCenterX(box)),
      boxCenterX(targetBox),
    ];
    const centerX = (Math.min(...spanCenters) + Math.max(...spanCenters)) / 2;
    const stacked = stackedFanOutSources.has(fanInJunctionId(target));
    const ratio = stacked ? JUNCTION_RUNWAY_RATIO / 2 : JUNCTION_RUNWAY_RATIO;
    const centerY = junctionRunwayCenterY(sourceBottom, targetBox.y, ratio);
    virtualJunctionBoxes.set(fanInJunctionId(target), {
      x: centerX,
      y: centerY,
      width: 1,
      height: 1,
    });
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
    // Fan-in targets are handled in the merge batch below; mixing them with
    // spine targets (e.g. Objetivo) would spawn a bogus fan-out circle.
    const fanOutLinks = active.filter(
      (link) =>
        !isJunctionId(link.target) &&
        !trunkContinuationToForkAnchor(layout, link.source, link.target),
    );
    if (fanOutLinks.length <= 1) {
      continue;
    }

    const sourceBox = resolveBox(source);
    if (!sourceBox) {
      continue;
    }

    const targetBoxes = fanOutLinks
      .map((link) => resolveBox(link.target))
      .filter((box): box is LayoutBox => box !== undefined);
    if (targetBoxes.length === 0) {
      continue;
    }

    const junctionId = fanOutJunctionId(source);
    const spanCenters = [
      boxCenterX(sourceBox),
      ...targetBoxes.map((box) => boxCenterX(box)),
    ];
    const centerX = (Math.min(...spanCenters) + Math.max(...spanCenters)) / 2;
    const centerY = junctionRunwayCenterY(
      sourceBox.y + sourceBox.height,
      Math.min(...targetBoxes.map((box) => box.y)),
    );
    const elbow: StepElbow = { centerX, centerY };
    nodes.push(junctionNode(junctionId, centerX, centerY));
    pushEdge(
      source,
      junctionId,
      isJunctionId(source) ? HANDLE_JUNCTION_OUT_BOTTOM : HANDLE_BOTTOM_OUT,
      HANDLE_JUNCTION_IN,
      elbow,
      isSameSpineColumn(centerX, centerX),
    );

    for (const link of fanOutLinks) {
      const targetBox = resolveBox(link.target);
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
    const mergeSpineTitle = target.startsWith("__join__in__")
      ? target.slice("__join__in__".length)
      : target;
    const tailForkAtMerge = layout.trunkForks.find((fork) => fork.after === mergeSpineTitle);
    const tailMergeJoinSplitFanIn =
      tailForkAtMerge !== undefined &&
      adjacentTailMergeJoinSplitAtAnchor(layout, tailForkAtMerge);
    const mergeJoinThenSplitFanIn = mergeJoinThenSplitFanInAt(layout, mergeSpineTitle);
    const mergeFanInJunctionId = fanInJunctionId(mergeSpineTitle);

    let active = batch.filter((link) => {
      if (used.has(spineLinkKey(link))) {
        return false;
      }
      if (
        (tailMergeJoinSplitFanIn || mergeJoinThenSplitFanIn) &&
        link.source === mergeFanInJunctionId
      ) {
        return false;
      }
      return true;
    });
    if (
      mergeSpineTitle === ROADMAP_END_ID &&
      active.length > 1 &&
      primaryTrunkParallelLane(layout) !== null
    ) {
      const tailTitle = layout.trunk[layout.trunk.length - 1];
      const tailLink = active.find((link) => link.source === tailTitle);
      if (tailLink !== undefined) {
        active = [tailLink];
      }
    }
    if (active.length <= 1) {
      continue;
    }
    const tailParallelMergeFork = tailParallelMergeForkAtMergeInto(layout, mergeSpineTitle);
    const targetBox =
      tailParallelMergeFork !== undefined
        ? resolveBox(ROADMAP_END_ID)
        : resolveBox(mergeSpineTitle);
    if (!targetBox) {
      continue;
    }

    const sourceBoxes = active
      .map((link) => resolveBox(link.source))
      .filter((box): box is LayoutBox => box !== undefined);
    if (sourceBoxes.length === 0) {
      continue;
    }

    const junctionId = target.startsWith("__join__in__") ? target : fanInJunctionId(target);
    const sourceBottom = Math.max(...sourceBoxes.map((box) => box.y + box.height));
    const spanCenters = [
      ...sourceBoxes.map((box) => boxCenterX(box)),
      boxCenterX(targetBox),
    ];
    const centerX = (Math.min(...spanCenters) + Math.max(...spanCenters)) / 2;
    // Keep the actual junction position in sync with the virtual one used
    // for stacked fan-out source resolution above.
    const stacked = stackedFanOutSources.has(junctionId);
    const ratio = stacked ? JUNCTION_RUNWAY_RATIO / 2 : JUNCTION_RUNWAY_RATIO;
    const centerY = junctionRunwayCenterY(sourceBottom, targetBox.y, ratio);
    const elbow: StepElbow = { centerX, centerY };
    nodes.push(junctionNode(junctionId, centerX, centerY));

    for (const link of active) {
      const sourceBox = resolveBox(link.source);
      if (!sourceBox) {
        continue;
      }

      const sourceCenterX = sourceBox.x + sourceBox.width / 2;
      const inHandle = pickJunctionInHandle(centerX, sourceCenterX);
      pushEdge(
        link.source,
        junctionId,
        isJunctionId(link.source) ? HANDLE_JUNCTION_OUT_BOTTOM : HANDLE_BOTTOM_OUT,
        inHandle,
        elbow,
        inHandle === HANDLE_JUNCTION_IN,
      );
      used.add(spineLinkKey(link));
    }

    if (tailParallelMergeFork !== undefined && !bySource.has(junctionId)) {
      pushEdge(
        junctionId,
        ROADMAP_END_ID,
        HANDLE_JUNCTION_OUT_BOTTOM,
        HANDLE_TOP_IN,
        elbow,
        isSameSpineColumn(centerX, targetBox.x + targetBox.width / 2),
      );
    } else if (
      !bySource.has(junctionId) &&
      !tailMergeJoinSplitFanIn &&
      !mergeJoinThenSplitFanIn
    ) {
      pushEdge(
        junctionId,
        mergeSpineTitle,
        HANDLE_JUNCTION_OUT_BOTTOM,
        HANDLE_TOP_IN,
        elbow,
        isSameSpineColumn(centerX, targetBox.x + targetBox.width / 2),
      );
    }
  }

  for (const link of remaining) {
    if (used.has(spineLinkKey(link))) {
      continue;
    }

    pushEdge(
      link.source,
      link.target,
      isJunctionId(link.source) ? HANDLE_JUNCTION_OUT_BOTTOM : HANDLE_BOTTOM_OUT,
      isJunctionId(link.target) ? HANDLE_JUNCTION_IN : HANDLE_TOP_IN,
    );
    used.add(spineLinkKey(link));
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

  const headTrunkFork = layout.trunkForks.find((fork) => inicioHeadFork(fork, layout.trunk));
  if (headTrunkFork !== undefined) {
    for (const lane of headTrunkFork.lanes) {
      const first = lane[0];
      if (first !== undefined) {
        queueSpineLink(ROADMAP_START_ID, first);
      }
    }
  } else {
    const startTarget =
      layout.parallelLanes.length === 1
        ? (layout.parallelLanes[0]?.[0] ?? layout.trunk[0])
        : (layout.trunk[0] ?? layout.parallelLanes[0]?.[0]);
    if (startTarget !== undefined) {
      queueSpineLink(ROADMAP_START_ID, startTarget);
    }
  }

  const trunkParallelLane = primaryTrunkParallelLane(layout);
  const parallelLaneSpineStaleForTrunkForks =
    layout.trunkForks.length > 0 &&
    layout.parallelLanes.some((lane) => lane.some((title) => !layout.trunk.includes(title)));

  if (trunkParallelLane === null && !parallelLaneSpineStaleForTrunkForks) {
    for (const lane of layout.parallelLanes) {
      for (let index = 0; index < lane.length - 1; index += 1) {
        const source = lane[index];
        const target = lane[index + 1];
        if (source === undefined || target === undefined) {
          continue;
        }
        queueSpineLink(source, target);
      }
    }
  }

  const mergeTarget = layout.trunk[0];
  const lateJoinFrom = new Set(layout.lateJoins.map((join) => join.from));
  if (
    mergeTarget !== undefined &&
    trunkParallelLane === null &&
    !parallelLaneSpineStaleForTrunkForks
  ) {
    for (const lane of layout.parallelLanes) {
      const last = lane[lane.length - 1];
      if (last !== undefined && last !== mergeTarget && !lateJoinFrom.has(last)) {
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
    const forkSource = fork.after;
    const forkSourceOnCanvas = layout.placements.has(forkSource);
    const headFork = inicioHeadFork(fork, layout.trunk);
    const anchorInLane = fork.lanes.flat().includes(fork.after);
    const tailAnchorInLane = tailParallelForkAnchorInLane(
      fork,
      layout.trunk,
      layout.trunkForks,
    );
    const afterIdxOnTrunk = layout.trunk.indexOf(fork.after);
    const forkPredecessorOnTrunk =
      afterIdxOnTrunk > 0 ? layout.trunk[afterIdxOnTrunk - 1] : undefined;
    const mergeJoinAnchor = layout.trunkForks.some(
      (entry) => entry.mergeInto === fork.after && entry.after !== fork.after,
    );
    const virtualMergeSplit =
      mergeJoinAnchor && !anchorInLane && fork.lanes.length === 1 && !headFork;
    const mergeJoinThenSplitStem =
      mergeJoinAnchor &&
      !headFork &&
      fork.lanes.length > 1 &&
      (anchorInLane || !fork.lanes.flat().includes(fork.after));
    const forkStemSource =
      mergeJoinAnchor && (anchorInLane || virtualMergeSplit || mergeJoinThenSplitStem)
        ? fanInJunctionId(fork.after)
        : tailAnchorInLane && forkPredecessorOnTrunk !== undefined
          ? forkPredecessorOnTrunk
          : forkSource;
    const tailMergeJoinSplitAtAnchor = adjacentTailMergeJoinSplitAtAnchor(layout, fork);
    const forkStemSourceOnCanvas = forkSourceOnCanvas || isJunctionId(forkStemSource);
    const mergeIntoIsLaneRoot = fork.lanes.some((lane) => lane[0] === fork.mergeInto);
    const tailLaneRootMerge =
      mergeIntoIsLaneRoot && fork.mergeInto === layout.trunk[layout.trunk.length - 1];
    if (virtualMergeSplit) {
      queueSpineLink(forkStemSource, fork.after);
      if (tailLaneRootMerge) {
        queueSpineLink(fork.after, ROADMAP_END_ID);
      }
    }

    const mergeAtParallelLaneRoot =
      mergeIntoIsLaneRoot &&
      fork.lanes.length > 1 &&
      fork.lanes.every((lane) => lane.length === 1) &&
      fork.lanes.some((lane) => lane[0] === fork.mergeInto);

    for (let laneIndex = 0; laneIndex < fork.lanes.length; laneIndex += 1) {
      const lane = fork.lanes[laneIndex]!;
      const first = lane[0];
      const blockStemOntoMergeLaneRoot =
        !tailAnchorInLane &&
        first === fork.mergeInto &&
        mergeAtParallelLaneRoot &&
        fork.after !== fork.mergeInto &&
        !tailMergeJoinSplitAtAnchor &&
        (mergeJoinAnchor || (forkStemSource === fork.after && anchorInLane));
      if (
        first !== undefined &&
        first !== forkStemSource &&
        forkStemSourceOnCanvas &&
        !headFork &&
        !blockStemOntoMergeLaneRoot
      ) {
        queueSpineLink(forkStemSource, first);
      }

      for (let index = 0; index < lane.length - 1; index += 1) {
        const source = lane[index];
        const target = lane[index + 1];
        if (source === undefined || target === undefined || source === target) {
          continue;
        }
        queueSpineLink(source, target);
      }

      const last = lane[lane.length - 1];
      const allowMergeJoinStemOntoLaneRoot =
        forkSource === fork.after && mergeJoinAnchor && !anchorInLane;
      const parallelTailOpensUpstreamOfLanes =
        mergeAtParallelLaneRoot &&
        fork.after !== fork.mergeInto &&
        (!anchorInLane || tailAnchorInLane);
      const skipSiblingMergeOntoLaneRoot =
        !parallelTailOpensUpstreamOfLanes &&
        last !== undefined &&
        last !== fork.mergeInto &&
        last !== fork.after &&
        mergeIntoIsLaneRoot &&
        last === lane[0] &&
        fork.lanes.some((other, index) => index !== laneIndex && other[0] === fork.mergeInto) &&
        (headFork || !allowMergeJoinStemOntoLaneRoot);
      const mergeTarget =
        mergeAtParallelLaneRoot || sharedTrunkMergeTarget(layout, fork.mergeInto)
          ? fanInJunctionId(fork.mergeInto)
          : fork.mergeInto;

      if (
        tailLaneRootMerge &&
        last === fork.mergeInto &&
        !mergeAtParallelLaneRoot
      ) {
        queueSpineLink(last, ROADMAP_END_ID);
      } else if (last !== undefined && last !== fork.mergeInto && !skipSiblingMergeOntoLaneRoot) {
        queueSpineLink(last, mergeTarget);
      } else if (last !== undefined && last === fork.mergeInto && mergeAtParallelLaneRoot) {
        queueSpineLink(last, mergeTarget);
      }
    }

    const tailForkOpensAtMergeInto = layout.trunkForks.find(
      (entry) => entry.after === fork.mergeInto,
    );
    const laneOnlyParallelMergeInto =
      !layout.trunk.includes(fork.mergeInto) ||
      (tailForkOpensAtMergeInto !== undefined &&
        !tailForkOpensAtMergeInto.lanes.flat().includes(fork.mergeInto));
    if (
      mergeAtParallelLaneRoot &&
      fork.lanes.flat().includes(fork.mergeInto) &&
      laneOnlyParallelMergeInto &&
      !mergeJoinThenSplitFanInAt(layout, fork.mergeInto) &&
      !(
        tailLaneRootMerge &&
        parallelTailLaneRootMergeForkAtMergeInto(layout, fork.mergeInto) !== undefined
      )
    ) {
      queueSpineLink(fanInJunctionId(fork.mergeInto), fork.mergeInto);
    }
  }

  for (const fork of layout.trunkForks) {
    const mergeInto = fork.mergeInto;
    const tailFork = layout.trunkForks.find(
      (entry) => entry.after === mergeInto && entry !== fork,
    );
    if (
      tailFork === undefined ||
      tailFork.lanes.flat().includes(mergeInto) ||
      fork.lanes.flat().includes(mergeInto) ||
      !layout.placements.has(mergeInto)
    ) {
      continue;
    }
    queueSpineLink(mergeInto, fanInJunctionId(mergeInto));
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
    const tailForkAtTarget = layout.trunkForks.find((fork) => fork.after === target);
    if (
      tailForkAtTarget !== undefined &&
      tailParallelForkAnchorInLane(tailForkAtTarget, layout.trunk, layout.trunkForks) &&
      source === layout.trunk[layout.trunk.indexOf(target) - 1]
    ) {
      continue;
    }
    queueSpineLink(source, target);
  }

  const trunkTail = layout.trunk[layout.trunk.length - 1];
  const tailMergeEndsAtObjetivo =
    trunkTail !== undefined &&
    parallelTailLaneRootMergeForkAtMergeInto(layout, trunkTail) !== undefined;
  if (trunkTail !== undefined) {
    if (!tailMergeEndsAtObjetivo) {
      queueSpineLink(trunkTail, ROADMAP_END_ID);
    }
  } else if (layout.parallelLanes.length > 0) {
    for (const lane of layout.parallelLanes) {
      const last = lane[lane.length - 1];
      if (last !== undefined) {
        queueSpineLink(last, ROADMAP_END_ID);
      }
    }
  }

  emitSpineLinks(spineLinks, layout, adjacency, nodes, edges, styleSuffix);
  emitBranchEdges(layout, edges, (_source, target, branchKind, groupTargets) =>
    branchEdgeStyleSuffix(target, isTopicDone, branchKind, groupTargets),
  );

  return { nodes, edges };
}
