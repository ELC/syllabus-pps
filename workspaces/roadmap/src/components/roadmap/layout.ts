import {
  type DegreeRoadmap,
  type DegreeRoadmapNodeTitle,
  type RoadmapConceptTitle,
  type RoadmapCuration,
} from "@pps/core";
import {
  ANCHOR_GAP,
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  BRANCH_COLUMN_GAP,
  BRANCH_NODE_HEIGHT,
  BRANCH_NODE_WIDTH,
  BRANCH_ROW_GAP,
  SPINE_NODE_HEIGHT,
  SPINE_NODE_WIDTH,
  STAGE_GAP,
} from "./constants";

export type RoadmapRole = "spine" | "branch";

export interface RoadmapPlacement {
  title: DegreeRoadmapNodeTitle;
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
  title?: DegreeRoadmapNodeTitle;
}

export interface RoadmapLayout {
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>;
  /** Visual grouping labels for the course roadmap. */
  courseYearBands?: CourseYearBand[];
  /** Snap targets for curated course grid editing. */
  courseGridCells?: CourseGridCell[];
  /** Spine title -> terminal topics hanging off it. */
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>;
  /** Center spine column (concept map). */
  trunk: RoadmapConceptTitle[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  bounds: RoadmapBounds;
}

const EMPTY_LAYOUT: RoadmapLayout = {
  placements: new Map(),
  attached: new Map(),
  trunk: [],
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
function expandedSplitPool(
  terminals: RoadmapConceptTitle[],
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
): RoadmapConceptTitle[] {
  const pool: RoadmapConceptTitle[] = [];

  for (const terminal of terminals) {
    pool.push(terminal);
    pool.push(...(attached.get(terminal) ?? []));
  }

  return pool;
}

function splitExpandedPool(
  terminals: RoadmapConceptTitle[],
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  flip = false,
): { left: RoadmapConceptTitle[]; right: RoadmapConceptTitle[] } {
  const left: RoadmapConceptTitle[] = [];
  const right: RoadmapConceptTitle[] = [];

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
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
  stageOf: Map<RoadmapConceptTitle, number>,
  terminals: RoadmapConceptTitle[],
  x: number,
  startY: number,
  visiting: Set<RoadmapConceptTitle>,
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
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  stageOf: Map<RoadmapConceptTitle, number>,
  terminals: RoadmapConceptTitle[],
  x: number,
  startY: number,
  visiting: Set<RoadmapConceptTitle>,
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
  terminals: RoadmapConceptTitle[],
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  visiting: Set<RoadmapConceptTitle>,
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
  title: RoadmapConceptTitle,
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  visiting = new Set<RoadmapConceptTitle>(),
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

function sortAttached(attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>): void {
  for (const [owner, terminals] of attached) {
    attached.set(owner, [...terminals].sort((left, right) => left.localeCompare(right, "es-AR")));
  }
}

function applySpineBranches(
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  ownerOf: Map<RoadmapConceptTitle, RoadmapConceptTitle>,
  branchForced: Set<RoadmapConceptTitle>,
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

function applyBranchOwnerOverrides(
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  ownerOf: Map<RoadmapConceptTitle, RoadmapConceptTitle>,
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
  terminals: RoadmapConceptTitle[],
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
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
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
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

function placeBranchStack(
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
  attached: Map<RoadmapConceptTitle, RoadmapConceptTitle[]>,
  stageOf: Map<RoadmapConceptTitle, number>,
  options: {
    title: RoadmapConceptTitle;
    owner: LayoutBox;
    laneCenter: number;
    branch: BranchPlacement;
    cursorY: number;
    rowHeight: number;
    sideFlip?: number;
    nested?: boolean;
    visiting?: Set<RoadmapConceptTitle>;
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
  const visiting = options.visiting ?? new Set<RoadmapConceptTitle>();

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

/** Course concept map: stored spine + laterals only (no correlativa DAG). */
export function buildLinearConceptLayout(
  roadmap: DegreeRoadmap,
  curation: RoadmapCuration,
): RoadmapLayout {
  const curationOpen = curation.open();
  if (!curationOpen.isDirectSpineStorage()) {
    return EMPTY_LAYOUT;
  }

  const inCourse = new Set(roadmap.concepts.map((concept) => concept.title));
  const mainSpine = curationOpen.mainSpineTitles();
  const trunk = mainSpine.filter((title) => inCourse.has(title));
  if (trunk.length === 0) {
    return EMPTY_LAYOUT;
  }

  const attached = new Map<RoadmapConceptTitle, RoadmapConceptTitle[]>();
  const ownerOf = new Map<RoadmapConceptTitle, RoadmapConceptTitle>();
  applySpineBranches(attached, ownerOf, new Set(), curation.branches);
  applyBranchOwnerOverrides(attached, ownerOf, curation.branchOwnerOverrides);
  sortAttached(attached);

  const stageOf = new Map<RoadmapConceptTitle, number>();
  trunk.forEach((title, index) => {
    stageOf.set(title, index);
  });

  const placements = new Map<DegreeRoadmapNodeTitle, RoadmapPlacement>();
  let cursorY = ANCHOR_NODE_HEIGHT + ANCHOR_GAP;
  let sideFlip = 0;
  const spineX = -SPINE_NODE_WIDTH / 2;

  for (const title of trunk) {
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

    cursorY += rowHeight + STAGE_GAP;
  }

  const positioned = [...placements.values()];
  const anchorX = -ANCHOR_NODE_WIDTH / 2;
  const end = { x: anchorX, y: cursorY - STAGE_GAP + ANCHOR_GAP };

  return {
    placements,
    attached,
    trunk,
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
