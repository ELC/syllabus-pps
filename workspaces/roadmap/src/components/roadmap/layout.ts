import type { DegreeRoadmap } from "@pps/core";

import { connectedTracks, countDescendants, topologicalStages, type RoadmapAdjacency } from "./adjacency";
import type { RoadmapCuration } from "./curation";
import {
  ANCHOR_GAP,
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  BRANCH_COLUMN_GAP,
  BRANCH_NODE_HEIGHT,
  BRANCH_NODE_WIDTH,
  BRANCH_ROW_GAP,
  LANE_GAP,
  SPINE_NODE_HEIGHT,
  SPINE_NODE_WIDTH,
  STAGE_GAP,
} from "./constants";

export type RoadmapRole = "spine" | "branch";

export interface RoadmapPlacement {
  title: string;
  role: RoadmapRole;
  stage: number;
  x: number;
  y: number;
  width: number;
  height: number;
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

export interface RoadmapLayout {
  placements: Map<string, RoadmapPlacement>;
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

function branchTreeHeight(title: string, attached: Map<string, string[]>): number {
  const terminals = attached.get(title) ?? [];
  if (terminals.length === 0) {
    return 0;
  }

  return terminals.reduce((height, terminal, index) => {
    const nested = branchTreeHeight(terminal, attached);
    const gap = index > 0 ? BRANCH_ROW_GAP : 0;
    const nestedBlock = nested > 0 ? BRANCH_ROW_GAP + nested : 0;
    return height + gap + BRANCH_NODE_HEIGHT + nestedBlock;
  }, 0);
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

  const picked = curation.parallelLanes.flatMap(({ root }) => {
    const track = tracks.find((entry) => entry.lead === root);
    return track ? [track] : [];
  });

  if (picked.length >= Math.min(2, curation.parallelLanes.length)) {
    return picked;
  }

  return tracks.slice(0, curation.parallelLanes.length);
}

function laneSpine(
  track: TrackInfo,
  deferred: ReadonlySet<string>,
  curation: RoadmapCuration,
): string[] {
  const lane = curation.parallelLanes.find((entry) => entry.root === track.lead);
  const spine = lane?.spine ?? track.spine;

  return spine.filter((title) => !deferred.has(title));
}

/**
 * Orders the merged spine so every concept sits below its prerequisites, following a dependency
 * chain for as long as there is one before starting the next track.
 */
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
  const mergeIntoTitles = new Set(trunkForks.map((fork) => fork.mergeInto));
  const trunk = [...prefix, ...tail.filter((title) => !mergeIntoTitles.has(title))];

  for (const fork of trunkForks) {
    const afterIndex = trunk.indexOf(fork.after);
    if (afterIndex >= 0 && !trunk.includes(fork.mergeInto)) {
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
}

function placeParallelLaneRows(context: ParallelLaneRowsContext): number {
  const { parallelLanes, centers, placements, attached, stageOf } = context;
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
      placeSpineNode(placements, stageOf, {
        title,
        laneCenter,
        cursorY,
        rowHeight,
      });
    }

    for (const { title, laneCenter, owner, terminals, branch } of rowBranchLayouts) {
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

function branchSideStackBox(
  owner: LayoutBox,
  side: "left" | "right",
  cursorY: number,
  rowHeight: number,
  terminalCount: number,
): LayoutBox {
  return {
    x: branchSideX(owner, side),
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
    const candidate = branchSideStackBox(owner, side, cursorY, rowHeight, terminalCount);
    if (!existing.some((box) => boxesOverlap(candidate, box))) {
      return { mode: "side", side };
    }
  }

  for (const side of preference) {
    const candidate = branchBelowStackBox(owner, side, laneCenter, terminalCount);
    if (!existing.some((box) => boxesOverlap(candidate, box))) {
      return { mode: "below", side };
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
  },
): number {
  const { title, owner, laneCenter, branch, cursorY, rowHeight, nested = false } = options;
  let sideFlip = options.sideFlip ?? 0;
  const terminals = attached.get(title) ?? [];

  if (terminals.length === 0) {
    return sideFlip;
  }

  const stackBox = nested
    ? branchBelowOwnerStackBox(owner, terminals.length)
    : branch.mode === "below"
      ? branchBelowStackBox(owner, branch.side, laneCenter, terminals.length)
      : branchSideStackBox(owner, branch.side, cursorY, rowHeight, terminals.length);

  terminals.forEach((terminal, index) => {
    placements.set(terminal, {
      title: terminal,
      role: "branch",
      stage: stageOf.get(terminal) ?? 0,
      x: stackBox.x,
      y: stackBox.y + index * (BRANCH_NODE_HEIGHT + BRANCH_ROW_GAP),
      width: BRANCH_NODE_WIDTH,
      height: BRANCH_NODE_HEIGHT,
    });
  });

  for (const terminal of terminals) {
    if ((attached.get(terminal) ?? []).length === 0) {
      continue;
    }

    const terminalPlacement = placements.get(terminal);
    if (terminalPlacement === undefined) {
      continue;
    }

    sideFlip = placeBranchStack(placements, attached, stageOf, {
      title: terminal,
      owner: terminalPlacement,
      laneCenter: terminalPlacement.x + terminalPlacement.width / 2,
      branch: { mode: "below", side: "right" },
      cursorY,
      rowHeight,
      sideFlip,
      nested: true,
    });
  }

  return sideFlip;
}

/**
 * Lays out parallel lanes at the top that merge into one solid spine. Concepts that other concepts
 * depend on sit on a lane or the spine; terminal concepts hang off the side.
 */
export function buildRoadmapLayout(
  roadmap: DegreeRoadmap,
  adjacency: RoadmapAdjacency,
  curation: RoadmapCuration,
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

  sortAttached(attached);
  applyBranchOwnerOverrides(attached, ownerOf, curation.branchOwnerOverrides);

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
  const parallelLanes = parallelTracks.map((track) => laneSpine(track, deferredSpine, curation));
  const parallelSpineTitles = new Set(parallelLanes.flat());
  const lateJoins = Object.entries(curation.spineJoins).flatMap(([from, to]) =>
    to === undefined ? [] : [{ from, to }],
  );
  const trunkForks: RoadmapTrunkForkLayout[] = (curation.trunkForks ?? []).map((fork) => ({
    after: fork.after,
    lanes: fork.lanes.map((lane) => lane.spine),
    mergeInto: fork.mergeInto,
  }));
  const trunkForkLaneTitles = new Set(trunkForks.flatMap((fork) => fork.lanes.flat()));
  const postMerge = curation.postMergeSpine.filter((title) => spineCandidates.includes(title));
  const trunkTailCandidates = spineCandidates.filter(
    (title) =>
      !parallelSpineTitles.has(title) &&
      !deferredSpine.has(title) &&
      !trunkForkLaneTitles.has(title),
  );
  const trunk =
    parallelLanes.length > 0
      ? composeTrunk(
          postMerge,
          orderTrunk(trunkTailCandidates, adjacency, stageOf),
          trunkForks,
        )
      : composeTrunk(
          [],
          orderTrunk(trunkTailCandidates, adjacency, stageOf),
          trunkForks,
        );
  const trunkForkByAfter = new Map(trunkForks.map((fork) => [fork.after, fork]));

  const placements = new Map<string, RoadmapPlacement>();
  let cursorY = ANCHOR_NODE_HEIGHT + ANCHOR_GAP;
  let sideFlip = 0;

  if (parallelLanes.length > 0) {
    cursorY = placeParallelLaneRows({
      parallelLanes,
      centers: laneCenters(parallelLanes.length),
      cursorY,
      placements,
      attached,
      stageOf,
    });
  }

  const spineX = -SPINE_NODE_WIDTH / 2;

  for (const title of trunk) {
    const terminals = attached.get(title) ?? [];
    const provisionalRowHeight = Math.max(SPINE_NODE_HEIGHT, branchTreeHeight(title, attached));
    const ownerBox: LayoutBox = {
      x: spineX,
      y: cursorY + (provisionalRowHeight - SPINE_NODE_HEIGHT) / 2,
      width: SPINE_NODE_WIDTH,
      height: SPINE_NODE_HEIGHT,
    };
    const branch =
      terminals.length === 0
        ? ({ mode: "side", side: "left" } as BranchPlacement)
        : pickBranchPlacement(
            ownerBox,
            0,
            sideFlip % 2,
            2,
            [-SPINE_NODE_WIDTH, SPINE_NODE_WIDTH],
            cursorY,
            provisionalRowHeight,
            terminals.length,
            placements,
          );
    const rowHeight = Math.max(
      provisionalRowHeight,
      branch.mode === "below" ? SPINE_NODE_HEIGHT + branchBelowHeight(terminals.length) : 0,
      provisionalRowHeight + nestedBelowOverflow(terminals, attached, provisionalRowHeight),
    );

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
      });
    }

    cursorY += rowHeight + STAGE_GAP;

    const fork = trunkForkByAfter.get(title);
    if (fork !== undefined) {
      cursorY = placeParallelLaneRows({
        parallelLanes: fork.lanes,
        centers: laneCenters(fork.lanes.length),
        cursorY,
        placements,
        attached,
        stageOf,
      });
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
    trunkForks,
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
