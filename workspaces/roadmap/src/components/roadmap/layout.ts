import type { DegreeRoadmap } from "@pps/core";

import { connectedTracks, countDescendants, topologicalStages, type RoadmapAdjacency } from "./adjacency";
import type { RoadmapCuration } from "./curation";
import {
  ANCHOR_GAP,
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  CAPSTONE_NODE_HEIGHT,
  CAPSTONE_NODE_WIDTH,
  BRANCH_COLUMN_GAP,
  BRANCH_NODE_HEIGHT,
  BRANCH_NODE_WIDTH,
  BRANCH_ROW_GAP,
  LANE_GAP,
  SPINE_NODE_HEIGHT,
  SPINE_NODE_WIDTH,
  STAGE_GAP,
} from "./constants";

export type RoadmapRole = "spine" | "branch" | "capstone";

export interface RoadmapPlacement {
  title: string;
  role: RoadmapRole;
  stage: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Capstone nodes only. Stable id for panel lookup and spine edges. */
  capstoneId?: string;
  description?: string;
}

export interface RoadmapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RoadmapTrunkForkLayout {
  after: string;
  lanes: string[][];
  mergeInto: string;
}

function normalizeMergeJoinForks(
  trunkForks: readonly RoadmapTrunkForkLayout[],
): RoadmapTrunkForkLayout[] {
  const mergeTargets = new Set(trunkForks.map((fork) => fork.mergeInto));
  return trunkForks
    .map((fork) => {
      if (!mergeTargets.has(fork.after)) {
        return fork;
      }

      const lanes = fork.lanes
        .map((lane) => lane.filter((title) => title !== fork.after))
        .filter((lane) => lane.length > 0);
      if (lanes.length < 2) {
        return fork;
      }

      return { ...fork, lanes };
    })
    .filter((fork) => {
      if (fork.lanes.length === 0) {
        return false;
      }

      return !(fork.lanes.length === 1 && fork.lanes[0]?.[0] === fork.mergeInto);
    });
}

function normalizeTailForkAnchors(
  trunkForks: readonly RoadmapTrunkForkLayout[],
  trunk: readonly string[],
): RoadmapTrunkForkLayout[] {
  const laneTitles = new Set(trunkForks.flatMap((fork) => fork.lanes.flat()));
  return trunkForks.map((fork) => {
    const afterIdx = trunk.indexOf(fork.after);
    const mergeIdx = trunk.indexOf(fork.mergeInto);

    // Merge target not on trunk: anchor at trunk tail so the fork opens after
    // whatever spine-only content survived from an older curation.
    if (afterIdx >= 0 && mergeIdx < 0 && afterIdx < trunk.length - 1) {
      return { ...fork, after: trunk[trunk.length - 1]! };
    }

    if (afterIdx < 0 || mergeIdx <= afterIdx + 1) {
      return fork;
    }

    // Only move when the intervening trunk nodes are spine-only (not part of
    // any fork lane). Otherwise the fork legitimately spans over its own lane
    // composition (e.g. mid-course fork whose lanes include trunk anchors).
    for (let idx = afterIdx + 1; idx < mergeIdx; idx += 1) {
      if (laneTitles.has(trunk[idx]!)) {
        return fork;
      }
    }

    const betterAfter = trunk[mergeIdx - 1]!;
    return { ...fork, after: betterAfter };
  });
}

function normalizeTailLaneRootTrunk(
  trunk: readonly string[],
  trunkForks: readonly RoadmapTrunkForkLayout[],
  savedTrunk: ReadonlySet<string>,
): string[] {
  let next = [...trunk];
  for (const fork of trunkForks) {
    if (!fork.lanes.some((lane) => lane[0] === fork.mergeInto)) {
      continue;
    }

    if (savedTrunk.has(fork.mergeInto)) {
      continue;
    }

    const afterIdx = next.indexOf(fork.after);
    const mergeIdx = next.indexOf(fork.mergeInto);
    if (afterIdx < 0 || mergeIdx <= afterIdx || mergeIdx >= next.length - 1) {
      continue;
    }

    next = [
      ...next.slice(0, mergeIdx),
      ...next.slice(mergeIdx + 1),
      fork.mergeInto,
    ];
  }

  return next;
}

function forkLaneTitleSet(fork: RoadmapTrunkForkLayout): Set<string> {
  return new Set(fork.lanes.flat());
}

/** Inicio opens straight into fork lanes; the anchor title only lives in a lane, not on the trunk row. */
function inicioHeadForkAnchor(fork: RoadmapTrunkForkLayout, trunk: readonly string[]): boolean {
  return fork.after === trunk[0] && forkLaneTitleSet(fork).has(fork.after);
}

/** Upstream fork merges here and this title opens another fork that lists the anchor in a lane. */
function mergeJoinThenSplitFork(
  fork: RoadmapTrunkForkLayout | undefined,
  title: string,
  trunkForks: readonly RoadmapTrunkForkLayout[],
): boolean {
  if (fork === undefined || fork.after !== title) {
    return false;
  }

  if (!forkLaneTitleSet(fork).has(title)) {
    return false;
  }

  return trunkForks.some((entry) => entry.mergeInto === title && entry.after !== fork.after);
}

/** ACID|trans-style tail pair: merge target is trunk tail and each lane is a single title. */
function tailParallelPairFork(
  fork: RoadmapTrunkForkLayout,
  trunk: readonly string[],
): boolean {
  if (!forkLaneTitleSet(fork).has(fork.after)) {
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

/** Skip the center spine row for the opening anchor (e.g. ACID before trans), not after subir trans. */
function tailParallelForkAnchorInLane(
  fork: RoadmapTrunkForkLayout,
  trunk: readonly string[],
  trunkForks: readonly RoadmapTrunkForkLayout[],
): boolean {
  if (!tailParallelPairFork(fork, trunk)) {
    return false;
  }

  if (trunkForks.some((other) => other !== fork && other.mergeInto === fork.after)) {
    return true;
  }

  return !trunkForks.some((other) => other !== fork && other.mergeInto === fork.mergeInto);
}

function tailParallelMergeIntoAnchorInLane(
  title: string,
  trunk: readonly string[],
  trunkForks: readonly RoadmapTrunkForkLayout[],
): boolean {
  return trunkForks.some(
    (fork) =>
      fork.mergeInto === title &&
      fork.after !== title &&
      tailParallelPairFork(fork, trunk),
  );
}

/** Where parallel lane rows attach on the trunk (anchor vs tail merge target). */
function forkLanePlacementAnchor(
  fork: RoadmapTrunkForkLayout,
  trunk: readonly string[],
  trunkForks: readonly RoadmapTrunkForkLayout[],
): string {
  if (
    !tailParallelPairFork(fork, trunk) ||
    trunk.indexOf(fork.mergeInto) !== trunk.length - 1
  ) {
    return fork.after;
  }

  const afterIsUpstreamMergeTarget = trunkForks.some(
    (other) => other !== fork && other.mergeInto === fork.after,
  );
  if (afterIsUpstreamMergeTarget) {
    return fork.mergeInto;
  }

  return fork.after;
}

export interface CourseYearBand {
  year: string;
  y: number;
  height: number;
}

export interface CourseGridCell {
  year: string;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  /** Course title when the cell is occupied. */
  title?: string;
}

export interface RoadmapLayout {
  placements: Map<string, RoadmapPlacement>;
  /** Visual grouping labels for the course roadmap. */
  courseYearBands?: CourseYearBand[];
  /** Snap targets for curated course grid editing. */
  courseGridCells?: CourseGridCell[];
  /** Spine title -> terminal topics hanging off it. */
  attached: Map<string, string[]>;
  /** Parallel lanes from the start, each ordered top to bottom. */
  parallelLanes: string[][];
  /** Single spine after the lanes merge. */
  trunk: string[];
  /** Parallel lane tails that merge into a later trunk node. */
  lateJoins: Array<{ from: string; to: string }>;
  /** Mid-trunk forks that split and merge back into one spine node. */
  trunkForks: RoadmapTrunkForkLayout[];
  /** Capstone id keyed by the trunk node they follow. */
  capstoneByAfter: Map<string, string>;
  start: { x: number; y: number };
  end: { x: number; y: number };
  bounds: RoadmapBounds;
}

const EMPTY_LAYOUT: RoadmapLayout = {
  placements: new Map(),
  attached: new Map(),
  parallelLanes: [],
  trunk: [],
  lateJoins: [],
  trunkForks: [],
  capstoneByAfter: new Map(),
  start: { x: -ANCHOR_NODE_WIDTH / 2, y: 0 },
  end: { x: -ANCHOR_NODE_WIDTH / 2, y: ANCHOR_NODE_HEIGHT + ANCHOR_GAP },
  bounds: {
    minX: -ANCHOR_NODE_WIDTH / 2,
    maxX: ANCHOR_NODE_WIDTH / 2,
    minY: 0,
    maxY: ANCHOR_NODE_HEIGHT * 2 + ANCHOR_GAP,
  },
};

function stackHeight(count: number): number {
  return count === 0 ? 0 : count * BRANCH_NODE_HEIGHT + (count - 1) * BRANCH_ROW_GAP;
}

/** Flatten direct side notes and one level of nested branch owners for balanced trunk splits. */
function expandedSplitPool(terminals: string[], attached: Map<string, string[]>): string[] {
  const pool: string[] = [];

  for (const terminal of terminals) {
    pool.push(terminal);
    pool.push(...(attached.get(terminal) ?? []));
  }

  return pool;
}

function splitExpandedPool(
  terminals: string[],
  attached: Map<string, string[]>,
  flip = false,
): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];

  for (const title of expandedSplitPool(terminals, attached)) {
    if (left.length <= right.length) {
      left.push(title);
    } else {
      right.push(title);
    }
  }

  if (flip) {
    return { left: right, right: left };
  }

  return { left, right };
}

/** Places a flat side column without nesting children below their parent. */
function placeFlatTerminalColumn(
  placements: Map<string, RoadmapPlacement>,
  stageOf: Map<string, number>,
  terminals: string[],
  x: number,
  startY: number,
  visiting: Set<string>,
): number {
  let y = startY;

  for (let index = 0; index < terminals.length; index += 1) {
    const terminal = terminals[index];
    if (terminal === undefined || visiting.has(terminal)) {
      continue;
    }

    visiting.add(terminal);

    placements.set(terminal, {
      title: terminal,
      role: "branch",
      stage: stageOf.get(terminal) ?? 0,
      x,
      y,
      width: BRANCH_NODE_WIDTH,
      height: BRANCH_NODE_HEIGHT,
    });

    y += BRANCH_NODE_HEIGHT;

    if (index < terminals.length - 1) {
      y += BRANCH_ROW_GAP;
    }
  }

  return y;
}

/** Places a vertical side column; nested branch owners continue below at the same x. */
function placeTerminalColumn(
  placements: Map<string, RoadmapPlacement>,
  attached: Map<string, string[]>,
  stageOf: Map<string, number>,
  terminals: string[],
  x: number,
  startY: number,
  visiting: Set<string>,
): number {
  let y = startY;

  for (let index = 0; index < terminals.length; index += 1) {
    const terminal = terminals[index];
    if (terminal === undefined || visiting.has(terminal)) {
      continue;
    }

    visiting.add(terminal);

    placements.set(terminal, {
      title: terminal,
      role: "branch",
      stage: stageOf.get(terminal) ?? 0,
      x,
      y,
      width: BRANCH_NODE_WIDTH,
      height: BRANCH_NODE_HEIGHT,
    });

    y += BRANCH_NODE_HEIGHT;

    const nested = attached.get(terminal) ?? [];
    if (nested.length > 0) {
      y += BRANCH_ROW_GAP;
      y = placeTerminalColumn(placements, attached, stageOf, nested, x, y, visiting);
    }

    if (index < terminals.length - 1) {
      y += BRANCH_ROW_GAP;
    }
  }

  return y;
}

function terminalStackHeight(
  terminals: string[],
  attached: Map<string, string[]>,
  visiting: Set<string>,
): number {
  return terminals.reduce((height, terminal, index) => {
    const nestedBranches = attached.get(terminal) ?? [];
    const nested =
      nestedBranches.length > 0 ? branchTreeHeight(terminal, attached, visiting) : 0;
    const gap = index > 0 ? BRANCH_ROW_GAP : 0;
    const nestedBlock = nested > 0 ? BRANCH_ROW_GAP + nested : 0;
    return height + gap + BRANCH_NODE_HEIGHT + nestedBlock;
  }, 0);
}

function branchTreeHeight(
  title: string,
  attached: Map<string, string[]>,
  visiting = new Set<string>(),
  splitSides = false,
): number {
  if (visiting.has(title)) {
    return 0;
  }

  const terminals = attached.get(title) ?? [];
  if (terminals.length === 0) {
    return 0;
  }

  visiting.add(title);

  if (splitSides && terminals.length > 1) {
    const { left, right } = splitExpandedPool(terminals, attached);
    return Math.max(stackHeight(left.length), stackHeight(right.length));
  }

  return terminalStackHeight(terminals, attached, visiting);
}

function sortAttached(attached: Map<string, string[]>): void {
  for (const [owner, terminals] of attached) {
    attached.set(owner, [...terminals].sort((left, right) => left.localeCompare(right, "es-AR")));
  }
}

function applyBranchOwnerOverrides(
  attached: Map<string, string[]>,
  ownerOf: Map<string, string>,
  branchOwnerOverrides: Record<string, string>,
): void {
  for (const [terminal, newOwner] of Object.entries(branchOwnerOverrides)) {
    if (newOwner === undefined) {
      continue;
    }

    const oldOwner = ownerOf.get(terminal);
    if (oldOwner === undefined) {
      continue;
    }

    if (oldOwner === newOwner) {
      continue;
    }

    ownerOf.set(terminal, newOwner);
    attached.set(
      oldOwner,
      (attached.get(oldOwner) ?? []).filter((title) => title !== terminal),
    );
    attached.set(newOwner, [...(attached.get(newOwner) ?? []), terminal]);
  }

  sortAttached(attached);
}

function applySpinePromotions(
  attached: Map<string, string[]>,
  ownerOf: Map<string, string>,
  spinePromotions: string[],
): void {
  for (const title of spinePromotions) {
    const owner = ownerOf.get(title);
    if (owner === undefined) {
      continue;
    }

    ownerOf.delete(title);
    attached.set(
      owner,
      (attached.get(owner) ?? []).filter((terminal) => terminal !== title),
    );
  }

  sortAttached(attached);
}

function applySpineBranches(
  attached: Map<string, string[]>,
  ownerOf: Map<string, string>,
  branchForced: Set<string>,
  spineBranches: Record<string, string[]>,
): void {
  const forcedBranches = new Set(Object.values(spineBranches).flatMap((branches) => branches));

  for (const branch of forcedBranches) {
    branchForced.add(branch);

    const previousOwner = ownerOf.get(branch);
    if (previousOwner !== undefined) {
      attached.set(
        previousOwner,
        (attached.get(previousOwner) ?? []).filter((title) => title !== branch),
      );
      ownerOf.delete(branch);
    }
  }

  for (const [owner, branches] of Object.entries(spineBranches)) {
    const kept = (attached.get(owner) ?? []).filter((title) => !forcedBranches.has(title));
    attached.set(owner, [...kept, ...branches]);

    for (const branch of branches) {
      const inverse = attached.get(branch) ?? [];
      if (inverse.includes(owner)) {
        attached.set(
          branch,
          inverse.filter((title) => title !== owner),
        );
      }

      if (ownerOf.get(owner) === branch) {
        ownerOf.delete(owner);
      }
    }
  }

  for (const [owner, terminals] of attached) {
    if (Object.hasOwn(spineBranches, owner)) {
      continue;
    }

    attached.set(owner, [...terminals].sort((left, right) => left.localeCompare(right, "es-AR")));
  }
}

function rankSpine(
  left: string,
  right: string,
  adjacency: RoadmapAdjacency,
  stageOf: Map<string, number>,
): number {
  return (
    (stageOf.get(left) ?? 0) - (stageOf.get(right) ?? 0) ||
    countDescendants(adjacency.nextSteps, right) - countDescendants(adjacency.nextSteps, left) ||
    left.localeCompare(right, "es-AR")
  );
}

/** Orders one independent track top to bottom. */
function orderTrackSpine(
  members: string[],
  adjacency: RoadmapAdjacency,
  stageOf: Map<string, number>,
): string[] {
  const remaining = new Set(members);
  const spine: string[] = [];
  let current: string | undefined;

  while (remaining.size > 0) {
    const ready = [...remaining].filter((title) =>
      [...(adjacency.prerequisites.get(title) ?? [])].every((prerequisite) =>
        remaining.has(prerequisite) ? false : true,
      ),
    );

    const pool = ready.length > 0 ? ready : [...remaining];
    const dependents = current ? adjacency.nextSteps.get(current) : undefined;
    const chained = dependents ? pool.filter((title) => dependents.has(title)) : [];
    const next = (chained.length > 0 ? chained : pool).sort((left, right) =>
      rankSpine(left, right, adjacency, stageOf),
    )[0];

    if (next === undefined) {
      break;
    }

    spine.push(next);
    remaining.delete(next);
    current = next;
  }

  return spine;
}

interface TrackInfo {
  members: string[];
  spine: string[];
  depth: number;
  lead: string;
}

function trackLead(members: string[], adjacency: RoadmapAdjacency): string {
  const memberSet = new Set(members);
  const roots = members.filter((title) =>
    [...(adjacency.prerequisites.get(title) ?? [])].every(
      (prerequisite) => !memberSet.has(prerequisite),
    ),
  );

  return (
    roots.sort((left, right) => left.localeCompare(right, "es-AR"))[0] ??
    [...members].sort((left, right) => left.localeCompare(right, "es-AR"))[0] ??
    ""
  );
}

function pickParallelTracks(tracks: TrackInfo[], curation: RoadmapCuration): TrackInfo[] {
  if (curation.parallelLanes.length === 0) {
    return tracks.slice(0, 2);
  }

  return curation.parallelLanes.map(({ root, spine }) => {
    const byLead = tracks.find((entry) => entry.lead === root);
    if (byLead) {
      return byLead;
    }

    const byMember = tracks.find((entry) => entry.members.includes(root));
    if (byMember) {
      return { ...byMember, lead: root };
    }

    const curatedSpine = spine.length > 0 ? spine : [root];
    return {
      members: curatedSpine,
      spine: curatedSpine,
      depth: 0,
      lead: root,
    };
  });
}

/** Drop fork lane siblings from a stored parallel spine when building the merged trunk column. */
function compressedSpineForTrunk(
  spine: readonly string[],
  trunkForks: readonly RoadmapTrunkForkLayout[],
): string[] {
  if (trunkForks.length === 0) {
    return [...spine];
  }

  const drop = new Set<string>();
  for (const fork of trunkForks) {
    for (const title of fork.lanes.flat()) {
      if (title !== fork.after && title !== fork.mergeInto) {
        drop.add(title);
      }
    }
  }

  return spine.filter((title) => !drop.has(title));
}

function curatedParallelCompressedSpine(
  curation: RoadmapCuration,
  spineCandidates: readonly string[],
): string[] {
  const allowed = new Set(spineCandidates);
  let best: string[] = [];

  for (const lane of curation.parallelLanes) {
    const spine = lane.spine.filter((title) => allowed.has(title));
    if (spine.length > best.length) {
      best = spine;
    }
  }

  return best;
}

function laneSpine(
  track: TrackInfo,
  deferred: ReadonlySet<string>,
  curation: RoadmapCuration,
  laneIndex: number,
  spineCandidates: readonly string[],
): string[] {
  const onSpine = new Set(spineCandidates);
  const curated = curation.parallelLanes[laneIndex];
  const spine = curated?.spine ?? track.spine;

  return spine.filter((title) => onSpine.has(title) && !deferred.has(title));
}

/**
 * Orders the merged spine so every concept sits below its prerequisites, following a dependency
 * chain for as long as there is one before starting the next track.
 */
export function orderTrunkTitles(
  candidates: string[],
  adjacency: RoadmapAdjacency,
  stageOf: Map<string, number>,
  finalTitle?: string,
): string[] {
  const trunk = orderTrunk(candidates, adjacency, stageOf);
  if (finalTitle === undefined || !candidates.includes(finalTitle)) {
    return trunk;
  }

  return [...trunk.filter((title) => title !== finalTitle), finalTitle];
}

function orderTrunk(
  candidates: string[],
  adjacency: RoadmapAdjacency,
  stageOf: Map<string, number>,
): string[] {
  const eligible = new Set(candidates);
  const tracks = connectedTracks(candidates, adjacency)
    .map((members) => members.filter((title) => eligible.has(title)))
    .filter((members) => members.length > 0)
    .map((members) => ({
      members,
      depth: Math.min(...members.map((title) => stageOf.get(title) ?? 0)),
      lead: trackLead(members, adjacency),
    }))
    .sort(
      (left, right) =>
        left.depth - right.depth ||
        right.members.length - left.members.length ||
        left.lead.localeCompare(right.lead, "es-AR"),
    );

  const trunk: string[] = [];
  const placed = new Set<string>();

  for (const track of tracks) {
    const remaining = new Set(track.members);
    let current: string | undefined;

    while (remaining.size > 0) {
      const ready = [...remaining].filter((title) =>
        [...(adjacency.prerequisites.get(title) ?? [])].every(
          (prerequisite) => !eligible.has(prerequisite) || placed.has(prerequisite),
        ),
      );

      const pool = ready.length > 0 ? ready : [...remaining];
      const dependents = current ? adjacency.nextSteps.get(current) : undefined;
      const chained = dependents ? pool.filter((title) => dependents.has(title)) : [];
      const next = (chained.length > 0 ? chained : pool).sort((left, right) =>
        rankSpine(left, right, adjacency, stageOf),
      )[0];

      if (next === undefined) {
        break;
      }

      trunk.push(next);
      placed.add(next);
      remaining.delete(next);
      current = next;
    }
  }

  return trunk;
}

function composeTrunk(
  prefix: string[],
  tail: string[],
  trunkForks: RoadmapTrunkForkLayout[],
): string[] {
  const trunk = [...prefix, ...tail];

  for (const fork of trunkForks) {
    if (trunk.includes(fork.mergeInto)) {
      continue;
    }

    const afterIndex = trunk.indexOf(fork.after);
    if (afterIndex >= 0) {
      trunk.splice(afterIndex + 1, 0, fork.mergeInto);
    }
  }

  return trunk;
}

function laneCenters(laneCount: number): number[] {
  const stride = SPINE_NODE_WIDTH + LANE_GAP;
  const first = -((laneCount - 1) * stride) / 2;

  return Array.from({ length: laneCount }, (_, index) => first + index * stride);
}

interface ParallelLaneRowsContext {
  parallelLanes: string[][];
  centers: number[];
  cursorY: number;
  placements: Map<string, RoadmapPlacement>;
  attached: Map<string, string[]>;
  stageOf: Map<string, number>;
  branchLayoutFlips?: Record<string, boolean>;
  /** Trunk titles already on the center spine column in this band. */
  centerSpineAnchors?: ReadonlySet<string>;
  spineX?: number;
}

function isCenterSpinePlacement(
  placement: RoadmapPlacement,
  spineX: number,
): boolean {
  return placement.role === "spine" && Math.abs(placement.x - spineX) < 1;
}

function placeParallelLaneRows(context: ParallelLaneRowsContext): number {
  const { parallelLanes, centers, placements, attached, stageOf } = context;
  const { centerSpineAnchors, spineX } = context;
  let { cursorY } = context;

  if (parallelLanes.length === 0) {
    return cursorY;
  }

  const laneDepth = Math.max(...parallelLanes.map((lane) => lane.length));

  for (let row = 0; row < laneDepth; row += 1) {
    const rowTitles = parallelLanes
      .map((lane, laneIndex) => ({ title: lane[row], laneIndex }))
      .filter((entry): entry is { title: string; laneIndex: number } => entry.title !== undefined);

    const provisionalRowHeight = Math.max(
      SPINE_NODE_HEIGHT,
      ...rowTitles.map(({ title }) =>
        Math.max(SPINE_NODE_HEIGHT, branchTreeHeight(title, attached)),
      ),
    );

    const rowSpineY = cursorY + (provisionalRowHeight - SPINE_NODE_HEIGHT) / 2;
    const rowBlockers = rowTitles.map(({ laneIndex }) =>
      spineBox(centers[laneIndex] ?? 0, rowSpineY),
    );
    const rowBranchLayouts = rowTitles.map(({ title, laneIndex }) => {
      const terminals = attached.get(title) ?? [];
      const laneCenter = centers[laneIndex] ?? 0;
      const owner = spineBox(laneCenter, rowSpineY);

      return {
        title,
        laneIndex,
        laneCenter,
        owner,
        terminals,
        branch:
          terminals.length === 0
            ? ({ mode: "side", side: "left" } as BranchPlacement)
            : pickBranchPlacement(
                owner,
                laneCenter,
                laneIndex,
                parallelLanes.length,
                centers,
                cursorY,
                provisionalRowHeight,
                terminals.length,
                placements,
                rowBlockers,
              ),
      };
    });

    const rowHeight = Math.max(
      provisionalRowHeight,
      ...rowBranchLayouts.map(({ terminals, branch }) =>
        Math.max(
          branch.mode === "below" ? SPINE_NODE_HEIGHT + branchBelowHeight(terminals.length) : 0,
          provisionalRowHeight + nestedBelowOverflow(terminals, attached, provisionalRowHeight),
        ),
      ),
    );

    for (const { title, laneCenter } of rowBranchLayouts) {
      if (
        centerSpineAnchors?.has(title) &&
        spineX !== undefined &&
        placements.has(title) &&
        isCenterSpinePlacement(placements.get(title)!, spineX)
      ) {
        continue;
      }

      placeSpineNode(placements, stageOf, {
        title,
        laneCenter,
        cursorY,
        rowHeight,
      });
    }

    for (const { title, laneIndex, laneCenter, owner, terminals, branch } of rowBranchLayouts) {
      if (terminals.length === 0) {
        continue;
      }

      const placedOwner = placements.get(title);
      placeBranchStack(placements, attached, stageOf, {
        title,
        owner: placedOwner ?? owner,
        laneCenter,
        branch,
        cursorY,
        rowHeight,
        laneIndex,
        laneCenters: centers,
        layoutFlip: context.branchLayoutFlips?.[title],
      });
    }

    cursorY += rowHeight + STAGE_GAP;
  }

  return cursorY;
}

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function boxesOverlap(left: LayoutBox, right: LayoutBox, gap = 8): boolean {
  return (
    left.x < right.x + right.width + gap &&
    right.x < left.x + left.width + gap &&
    left.y < right.y + right.height + gap &&
    right.y < left.y + left.height + gap
  );
}

function spineBox(laneCenter: number, spineY: number): LayoutBox {
  return {
    x: laneCenter - SPINE_NODE_WIDTH / 2,
    y: spineY,
    width: SPINE_NODE_WIDTH,
    height: SPINE_NODE_HEIGHT,
  };
}

function branchSideX(owner: LayoutBox, side: "left" | "right"): number {
  return side === "left"
    ? owner.x - BRANCH_COLUMN_GAP - BRANCH_NODE_WIDTH
    : owner.x + owner.width + BRANCH_COLUMN_GAP;
}

/** Centers side columns in the gap between parallel lane spines when there is room. */
function branchColumnX(
  owner: LayoutBox,
  side: "left" | "right",
  laneIndex?: number,
  laneCenters?: number[],
): number {
  if (laneCenters === undefined || laneIndex === undefined || laneCenters.length <= 1) {
    return branchSideX(owner, side);
  }

  if (side === "left") {
    const neighborCenter = laneCenters[laneIndex - 1];
    if (neighborCenter === undefined) {
      return branchSideX(owner, side);
    }

    const corridorLeft = neighborCenter + SPINE_NODE_WIDTH / 2;
    const corridorRight = owner.x;
    const corridorWidth = corridorRight - corridorLeft;
    if (corridorWidth >= BRANCH_NODE_WIDTH) {
      return corridorLeft + (corridorWidth - BRANCH_NODE_WIDTH) / 2;
    }

    return branchSideX(owner, side);
  }

  const neighborCenter = laneCenters[laneIndex + 1];
  if (neighborCenter === undefined) {
    return branchSideX(owner, side);
  }

  const corridorLeft = owner.x + owner.width;
  const corridorRight = neighborCenter - SPINE_NODE_WIDTH / 2;
  const corridorWidth = corridorRight - corridorLeft;
  if (corridorWidth >= BRANCH_NODE_WIDTH) {
    return corridorLeft + (corridorWidth - BRANCH_NODE_WIDTH) / 2;
  }

  return branchSideX(owner, side);
}

function branchSideStackBox(
  owner: LayoutBox,
  side: "left" | "right",
  cursorY: number,
  rowHeight: number,
  terminalCount: number,
  laneIndex?: number,
  laneCenters?: number[],
): LayoutBox {
  return {
    x: branchColumnX(owner, side, laneIndex, laneCenters),
    y: cursorY + (rowHeight - stackHeight(terminalCount)) / 2,
    width: BRANCH_NODE_WIDTH,
    height: stackHeight(terminalCount),
  };
}

type BranchPlacement = { mode: "side" | "below"; side: "left" | "right" };

function branchBelowOwnerStackBox(owner: LayoutBox, terminalCount: number): LayoutBox {
  return {
    x: owner.x,
    y: owner.y + owner.height + BRANCH_ROW_GAP,
    width: BRANCH_NODE_WIDTH,
    height: stackHeight(terminalCount),
  };
}

function nestedBelowOverflow(
  terminals: string[],
  attached: Map<string, string[]>,
  rowHeight: number,
): number {
  if (terminals.length === 0) {
    return 0;
  }

  const stackTop = (rowHeight - stackHeight(terminals.length)) / 2;
  let overflow = 0;

  for (let index = 0; index < terminals.length; index += 1) {
    const terminal = terminals[index];
    if (terminal === undefined || (attached.get(terminal) ?? []).length === 0) {
      continue;
    }

    const terminalBottom =
      stackTop + (index + 1) * BRANCH_NODE_HEIGHT + index * BRANCH_ROW_GAP;
    overflow = Math.max(
      overflow,
      terminalBottom + BRANCH_ROW_GAP + branchTreeHeight(terminal, attached) - rowHeight,
    );
  }

  return Math.max(0, overflow);
}

function branchBelowStackBox(
  owner: LayoutBox,
  side: "left" | "right",
  laneCenter: number,
  terminalCount: number,
): LayoutBox {
  let x = branchSideX(owner, side);
  const corridorRight = laneCenter + SPINE_NODE_WIDTH / 2 + 8;
  const corridorLeft = laneCenter - SPINE_NODE_WIDTH / 2 - 8;

  if (side === "right" && x < corridorRight) {
    x = corridorRight;
  }

  if (side === "left" && x + BRANCH_NODE_WIDTH > corridorLeft) {
    x = corridorLeft - BRANCH_NODE_WIDTH;
  }

  return {
    x,
    y: owner.y + owner.height + BRANCH_ROW_GAP,
    width: BRANCH_NODE_WIDTH,
    height: stackHeight(terminalCount),
  };
}

/** Branch into the widest gap beside the owner so dependents read as belonging to that spine. */
function branchSidePreference(
  laneIndex: number,
  laneCount: number,
  laneCenters: number[],
  owner: LayoutBox,
): Array<"left" | "right"> {
  const foreignCenters = laneCenters.filter((_, index) => index !== laneIndex);
  const clearance = (side: "left" | "right") => {
    const anchor = branchSideX(owner, side) + BRANCH_NODE_WIDTH / 2;
    return Math.min(...foreignCenters.map((center) => Math.abs(anchor - center)));
  };

  return [...(["left", "right"] as const)].sort((left, right) => {
    const byClearance = clearance(right) - clearance(left);
    if (byClearance !== 0) {
      return byClearance;
    }

    if (laneIndex === 0) {
      return left === "right" ? -1 : 1;
    }

    if (laneIndex === laneCount - 1) {
      return left === "left" ? -1 : 1;
    }

    return left === "left" ? -1 : 1;
  });
}

function pickBranchPlacement(
  owner: LayoutBox,
  laneCenter: number,
  laneIndex: number,
  laneCount: number,
  laneCenters: number[],
  cursorY: number,
  rowHeight: number,
  terminalCount: number,
  placements: Map<string, RoadmapPlacement>,
  rowBlockers: LayoutBox[] = [],
): BranchPlacement {
  const preference = branchSidePreference(laneIndex, laneCount, laneCenters, owner);
  const existing = [...placements.values(), ...rowBlockers];

  for (const side of preference) {
    const candidate = branchSideStackBox(
      owner,
      side,
      cursorY,
      rowHeight,
      terminalCount,
      laneIndex,
      laneCenters,
    );
    if (!existing.some((box) => boxesOverlap(candidate, box))) {
      return { mode: "side", side };
    }
  }

  if (terminalCount > 1) {
    for (const side of preference) {
      const candidate = branchBelowStackBox(owner, side, laneCenter, terminalCount);
      if (!existing.some((box) => boxesOverlap(candidate, box))) {
        return { mode: "below", side };
      }
    }
  }

  return { mode: "side", side: preference[0] ?? "right" };
}

function branchBelowHeight(terminalCount: number): number {
  return terminalCount === 0
    ? 0
    : BRANCH_ROW_GAP + stackHeight(terminalCount);
}

function placeSpineNode(
  placements: Map<string, RoadmapPlacement>,
  stageOf: Map<string, number>,
  options: {
    title: string;
    laneCenter: number;
    cursorY: number;
    rowHeight: number;
  },
): void {
  const { title, laneCenter, cursorY, rowHeight } = options;

  placements.set(title, {
    title,
    role: "spine",
    stage: stageOf.get(title) ?? 0,
    x: laneCenter - SPINE_NODE_WIDTH / 2,
    y: cursorY + (rowHeight - SPINE_NODE_HEIGHT) / 2,
    width: SPINE_NODE_WIDTH,
    height: SPINE_NODE_HEIGHT,
  });
}

function placeBranchStack(
  placements: Map<string, RoadmapPlacement>,
  attached: Map<string, string[]>,
  stageOf: Map<string, number>,
  options: {
    title: string;
    owner: LayoutBox;
    laneCenter: number;
    branch: BranchPlacement;
    cursorY: number;
    rowHeight: number;
    sideFlip?: number;
    nested?: boolean;
    visiting?: Set<string>;
    /** Split side notes across left and right; only for the center trunk spine. */
    splitSides?: boolean;
    laneIndex?: number;
    laneCenters?: number[];
    layoutFlip?: boolean;
  },
): number {
  const {
    title,
    owner,
    laneCenter,
    branch,
    cursorY,
    rowHeight,
    nested = false,
    splitSides = false,
    laneIndex,
    laneCenters,
    layoutFlip = false,
  } = options;
  let sideFlip = options.sideFlip ?? 0;
  const visiting = options.visiting ?? new Set<string>();

  if (visiting.has(title)) {
    return sideFlip;
  }

  visiting.add(title);

  const terminals = attached.get(title) ?? [];

  if (terminals.length === 0) {
    return sideFlip;
  }

  if (splitSides && !nested && terminals.length > 1) {
    const { left, right } = splitExpandedPool(terminals, attached, layoutFlip);
    const spineMidY = owner.y + owner.height / 2;
    const columnVisiting = new Set(visiting);

    const leftHeight = stackHeight(left.length);
    placeFlatTerminalColumn(
      placements,
      stageOf,
      left,
      branchSideX(owner, "left"),
      spineMidY - leftHeight / 2,
      columnVisiting,
    );

    const rightHeight = stackHeight(right.length);
    placeFlatTerminalColumn(
      placements,
      stageOf,
      right,
      branchSideX(owner, "right"),
      spineMidY - rightHeight / 2,
      columnVisiting,
    );

    return sideFlip;
  }

  const columnHeight = terminalStackHeight(terminals, attached, new Set(visiting));
  let columnX: number;
  let columnStartY: number;

  if (nested) {
    columnX = owner.x;
    columnStartY = owner.y + owner.height + BRANCH_ROW_GAP;
  } else if (branch.mode === "below") {
    const belowBox = branchBelowStackBox(owner, branch.side, laneCenter, terminals.length);
    columnX = belowBox.x;
    columnStartY = belowBox.y;
  } else {
    const spineMidY = owner.y + owner.height / 2;
    const side =
      layoutFlip && branch.mode === "side"
        ? branch.side === "left"
          ? "right"
          : "left"
        : branch.side;
    columnX = branchColumnX(owner, side, laneIndex, laneCenters);
    columnStartY = spineMidY - columnHeight / 2;
  }

  placeTerminalColumn(
    placements,
    attached,
    stageOf,
    terminals,
    columnX,
    columnStartY,
    visiting,
  );

  return sideFlip;
}

/**
 * Lays out parallel lanes at the top that merge into one solid spine. Concepts that other concepts
 * depend on sit on a lane or the spine; terminal concepts hang off the side.
 */
export interface RoadmapLayoutOptions {
  /** Course correlativas DAGs keep every node on a lane or the trunk. */
  disableBranches?: boolean;
}

export function buildRoadmapLayout(
  roadmap: DegreeRoadmap,
  adjacency: RoadmapAdjacency,
  curation: RoadmapCuration,
  options: RoadmapLayoutOptions = {},
): RoadmapLayout {
  const titles = roadmap.concepts.map((concept) => concept.title);
  if (titles.length === 0) {
    return EMPTY_LAYOUT;
  }

  const stageOf = new Map<string, number>();
  topologicalStages(titles, adjacency).forEach((stage, index) => {
    for (const title of stage) {
      stageOf.set(title, index);
    }
  });

  const isTerminal = (title: string) => (adjacency.nextSteps.get(title)?.size ?? 0) === 0;

  const attached = new Map<string, string[]>();
  const ownerOf = new Map<string, string>();

  if (!options.disableBranches) {
    for (const title of titles) {
      if (!isTerminal(title)) {
        continue;
      }

      const [owner] = [...(adjacency.prerequisites.get(title) ?? [])].sort(
        (left, right) =>
          (stageOf.get(right) ?? 0) - (stageOf.get(left) ?? 0) ||
          left.localeCompare(right, "es-AR"),
      );

      if (owner !== undefined) {
        ownerOf.set(title, owner);
        attached.set(owner, [...(attached.get(owner) ?? []), title]);
      }
    }
  }

  sortAttached(attached);
  applyBranchOwnerOverrides(attached, ownerOf, curation.branchOwnerOverrides);
  applySpinePromotions(attached, ownerOf, curation.spinePromotions ?? []);

  const branchForced = new Set<string>();
  applySpineBranches(attached, ownerOf, branchForced, curation.branches);

  const spineCandidates = titles.filter((title) => !ownerOf.has(title) && !branchForced.has(title));
  const deferredSpine = new Set<string>(
    curation.postMergeSpine.filter((title) => spineCandidates.includes(title)),
  );

  const tracks: TrackInfo[] = connectedTracks(spineCandidates, adjacency)
    .map((members) => members.filter((title) => spineCandidates.includes(title)))
    .filter((members) => members.length > 0)
    .map((members) => ({
      members,
      spine: orderTrackSpine(members, adjacency, stageOf),
      depth: Math.min(...members.map((title) => stageOf.get(title) ?? 0)),
      lead: trackLead(members, adjacency),
    }))
    .sort(
      (left, right) =>
        right.spine.length - left.spine.length ||
        left.depth - right.depth ||
        left.lead.localeCompare(right.lead, "es-AR"),
    );

  const parallelTracks = pickParallelTracks(tracks, curation);
  const parallelLanes = parallelTracks.map((track, laneIndex) =>
    laneSpine(track, deferredSpine, curation, laneIndex, spineCandidates),
  );
  const parallelSpineTitles = new Set(parallelLanes.flat());
  const lateJoins = Object.entries(curation.spineJoins).flatMap(([from, to]) =>
    to === undefined ? [] : [{ from, to }],
  );
  const trunkForks: RoadmapTrunkForkLayout[] = normalizeMergeJoinForks(
    (curation.trunkForks ?? [])
      .map((fork) => ({
        after: fork.after,
        lanes: fork.lanes.map((lane) => lane.spine).filter((spine) => spine.length > 0),
        mergeInto: fork.mergeInto,
      }))
      .filter((fork) => fork.lanes.length > 0),
  );
  const trunkForkLaneTitles = new Set(trunkForks.flatMap((fork) => fork.lanes.flat()));
  const postMerge = curation.postMergeSpine.filter((title) => spineCandidates.includes(title));
  const trunkTailCandidates = spineCandidates.filter(
    (title) =>
      !parallelSpineTitles.has(title) &&
      !deferredSpine.has(title) &&
      !trunkForkLaneTitles.has(title),
  );
  const curatedTrunkTail = (curation.trunkSpine ?? []).filter((title) =>
    spineCandidates.includes(title),
  );
  const orderedTrunkTail = orderTrunk(trunkTailCandidates, adjacency, stageOf);
  const parallelCompressedSpine = curatedParallelCompressedSpine(curation, spineCandidates);
  const parallelOnlyMainSpine =
    (curation.trunkSpine ?? []).length === 0 &&
    curation.parallelLanes.length === 1 &&
    (curation.parallelLanes[0]?.spine.length ?? 0) > 0
      ? curation.parallelLanes[0]!.spine.filter((title) => spineCandidates.includes(title))
      : null;
  const parallelTrunkSpine = compressedSpineForTrunk(
    parallelOnlyMainSpine ?? parallelCompressedSpine,
    trunkForks,
  );
  const trunkTail =
    curatedTrunkTail.length > 0
      ? curatedTrunkTail
      : orderedTrunkTail.length > 0
        ? orderedTrunkTail
        : parallelTrunkSpine;
  const composedTrunk =
    parallelLanes.length > 0
      ? composeTrunk(postMerge, trunkTail, trunkForks)
      : composeTrunk([], trunkTail, trunkForks);
  const trunk = normalizeTailLaneRootTrunk(
    composedTrunk,
    trunkForks,
    new Set(curatedTrunkTail.length > 0 ? curatedTrunkTail : parallelTrunkSpine),
  );
  const displayTrunkForks = normalizeTailForkAnchors(trunkForks, trunk);
  const trunkForkByAfter = new Map(displayTrunkForks.map((fork) => [fork.after, fork]));
  const capstoneByAfter = new Map(
    (curation.capstones ?? []).map((capstone) => [capstone.after, capstone]),
  );

  const placements = new Map<string, RoadmapPlacement>();
  let cursorY = ANCHOR_NODE_HEIGHT + ANCHOR_GAP;
  let sideFlip = 0;

  const parallelPrefaceIsTrunkSubset =
    parallelLanes.length === 1 &&
    trunk.length > 0 &&
    parallelLanes[0]!.length > 0 &&
    parallelLanes[0]![0] === trunk[0] &&
    parallelLanes[0]!.every((title) => trunk.includes(title));

  const skipParallelPrefaceWithTrunkForks =
    displayTrunkForks.length > 0 &&
    parallelLanes.length === 1 &&
    (parallelLanes[0]?.length ?? 0) > 1 &&
    !parallelPrefaceIsTrunkSubset;

  if (parallelLanes.length > 0 && !parallelPrefaceIsTrunkSubset && !skipParallelPrefaceWithTrunkForks) {
    cursorY = placeParallelLaneRows({
      parallelLanes,
      centers: laneCenters(parallelLanes.length),
      cursorY,
      placements,
      attached,
      stageOf,
      branchLayoutFlips: curation.branchLayoutFlips,
    });
  }

  const spineX = -SPINE_NODE_WIDTH / 2;

  for (const title of trunk) {
    const bandStartY = cursorY;
    const fork = trunkForkByAfter.get(title);
    const headForkAnchor = fork !== undefined && inicioHeadForkAnchor(fork, trunk);
    const mergeJoinThenSplit = mergeJoinThenSplitFork(fork, title, displayTrunkForks);
    const tailAnchorInLane =
      fork !== undefined && tailParallelForkAnchorInLane(fork, trunk, displayTrunkForks);
    const tailMergeIntoInLane = tailParallelMergeIntoAnchorInLane(
      title,
      trunk,
      displayTrunkForks,
    );
    const skipCenterSpineRow =
      headForkAnchor || mergeJoinThenSplit || tailAnchorInLane || tailMergeIntoInLane;
    const reuseLanePlacement = skipCenterSpineRow ? undefined : placements.get(title);
    const terminals = attached.get(title) ?? [];
    const willSplit = terminals.length > 1;
    const branchSubtreeHeight = branchTreeHeight(title, attached, new Set(), willSplit);
    const rowHeight = Math.max(SPINE_NODE_HEIGHT, branchSubtreeHeight);
    const ownerBox: LayoutBox = {
      x: spineX,
      y: cursorY + (rowHeight - SPINE_NODE_HEIGHT) / 2,
      width: SPINE_NODE_WIDTH,
      height: SPINE_NODE_HEIGHT,
    };
    const branch =
      terminals.length === 0
        ? ({ mode: "side", side: "left" } as BranchPlacement)
        : willSplit
          ? ({ mode: "side", side: "left" } as BranchPlacement)
          : pickBranchPlacement(
              ownerBox,
              0,
              sideFlip % 2,
              2,
              [-SPINE_NODE_WIDTH, SPINE_NODE_WIDTH],
              cursorY,
              rowHeight,
              terminals.length,
              placements,
            );

    if (!skipCenterSpineRow && reuseLanePlacement === undefined) {
      placements.set(title, {
        title,
        role: "spine",
        stage: stageOf.get(title) ?? 0,
        x: spineX,
        y: cursorY + (rowHeight - SPINE_NODE_HEIGHT) / 2,
        width: SPINE_NODE_WIDTH,
        height: SPINE_NODE_HEIGHT,
      });

      if (terminals.length > 0) {
        const owner = placements.get(title)!;
        sideFlip += 1;

        sideFlip = placeBranchStack(placements, attached, stageOf, {
          title,
          owner,
          laneCenter: 0,
          branch,
          cursorY,
          rowHeight,
          sideFlip,
          splitSides: willSplit,
          layoutFlip: curation.branchLayoutFlips?.[title],
        });
      }
    }

    const bandForks = displayTrunkForks.filter(
      (entry) => forkLanePlacementAnchor(entry, trunk, displayTrunkForks) === title,
    );
    const coLocateForkWithSpine =
      !skipCenterSpineRow && bandForks.length > 0 && reuseLanePlacement === undefined;

    const forkClearance =
      !skipCenterSpineRow &&
      reuseLanePlacement === undefined &&
      fork !== undefined &&
      branchSubtreeHeight > SPINE_NODE_HEIGHT
        ? STAGE_GAP / 2
        : 0;

    if (coLocateForkWithSpine) {
      for (const laneFork of bandForks) {
        cursorY = placeParallelLaneRows({
          parallelLanes: laneFork.lanes,
          centers: laneCenters(laneFork.lanes.length),
          cursorY: bandStartY,
          placements,
          attached,
          stageOf,
          branchLayoutFlips: curation.branchLayoutFlips,
          centerSpineAnchors: new Set([title]),
          spineX,
        });
      }
      cursorY = Math.max(cursorY, bandStartY + rowHeight + STAGE_GAP + forkClearance);
    } else if (headForkAnchor) {
      // fork lanes follow directly under Inicio
    } else if (mergeJoinThenSplit) {
      cursorY += rowHeight + STAGE_GAP;
    } else if (reuseLanePlacement !== undefined) {
      cursorY = Math.max(
        cursorY,
        reuseLanePlacement.y + reuseLanePlacement.height + STAGE_GAP,
      );
    } else {
      cursorY += rowHeight + STAGE_GAP + forkClearance;
    }

    const capstone = capstoneByAfter.get(title);
    if (capstone !== undefined) {
      const capstoneX = spineX + (SPINE_NODE_WIDTH - CAPSTONE_NODE_WIDTH) / 2;
      placements.set(capstone.id, {
        title: capstone.title,
        role: "capstone",
        stage: stageOf.get(title) ?? 0,
        x: capstoneX,
        y: cursorY,
        width: CAPSTONE_NODE_WIDTH,
        height: CAPSTONE_NODE_HEIGHT,
        capstoneId: capstone.id,
        description: capstone.description,
      });
      cursorY += CAPSTONE_NODE_HEIGHT + STAGE_GAP;
    }

    if (!coLocateForkWithSpine) {
      for (const laneFork of bandForks) {
        cursorY = placeParallelLaneRows({
          parallelLanes: laneFork.lanes,
          centers: laneCenters(laneFork.lanes.length),
          cursorY,
          placements,
          attached,
          stageOf,
          branchLayoutFlips: curation.branchLayoutFlips,
        });
      }
    }
  }

  const positioned = [...placements.values()];
  if (positioned.length === 0) {
    return EMPTY_LAYOUT;
  }

  const anchorX = -ANCHOR_NODE_WIDTH / 2;
  const end = { x: anchorX, y: cursorY - STAGE_GAP + ANCHOR_GAP };

  return {
    placements,
    attached,
    parallelLanes,
    trunk,
    lateJoins,
    trunkForks: displayTrunkForks,
    capstoneByAfter: new Map(
      [...capstoneByAfter.entries()].map(([after, capstone]) => [after, capstone.id]),
    ),
    start: { x: anchorX, y: 0 },
    end,
    bounds: {
      minX: Math.min(anchorX, ...positioned.map((node) => node.x)),
      maxX: Math.max(anchorX + ANCHOR_NODE_WIDTH, ...positioned.map((node) => node.x + node.width)),
      minY: 0,
      maxY: end.y + ANCHOR_NODE_HEIGHT,
    },
  };
}
