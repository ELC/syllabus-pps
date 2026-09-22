import type { DegreeRoadmap } from "@pps/core";
import type { Node } from "@xyflow/react";

import type { RoadmapCuration } from "./curation";
import { EMPTY_ROADMAP_CURATION } from "./curation";

function titleInScope(title: string, scope: ReadonlySet<string>): boolean {
  return scope.has(title);
}

function filterTitles(titles: string[], scope: ReadonlySet<string>): string[] {
  return titles.filter((title) => titleInScope(title, scope));
}

function filterBranches(
  branches: Record<string, string[]>,
  scope: ReadonlySet<string>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};

  for (const [owner, items] of Object.entries(branches)) {
    if (!titleInScope(owner, scope)) {
      continue;
    }

    const filtered = filterTitles(items, scope);
    if (filtered.length > 0) {
      next[owner] = filtered;
    }
  }

  return next;
}

/** Keeps only curation entries whose titles belong to the course concept subgraph. */
export function sliceCurationForCourse(
  curation: RoadmapCuration,
  courseRoadmap: DegreeRoadmap,
): RoadmapCuration {
  const scope = new Set(courseRoadmap.concepts.map((concept) => concept.title));

  const parallelLanes = curation.parallelLanes
    .map((lane) => ({
      root: lane.root,
      spine: filterTitles(lane.spine, scope),
    }))
    .filter((lane) => titleInScope(lane.root, scope) && lane.spine.length > 0);

  const trunkForks = (curation.trunkForks ?? [])
    .filter(
      (fork) =>
        titleInScope(fork.after, scope) &&
        titleInScope(fork.mergeInto, scope),
    )
    .map((fork) => ({
      ...fork,
      lanes: fork.lanes
        .map((lane) => ({
          root: lane.root,
          spine: filterTitles(lane.spine, scope),
        }))
        .filter((lane) => titleInScope(lane.root, scope) && lane.spine.length > 0),
    }))
    .filter((fork) => fork.lanes.length > 0);

  const branchOwnerOverrides: Record<string, string> = {};
  for (const [branch, owner] of Object.entries(curation.branchOwnerOverrides)) {
    if (titleInScope(branch, scope) && titleInScope(owner, scope)) {
      branchOwnerOverrides[branch] = owner;
    }
  }

  const spineJoins: Record<string, string> = {};
  for (const [from, to] of Object.entries(curation.spineJoins)) {
    if (titleInScope(from, scope) && titleInScope(to, scope)) {
      spineJoins[from] = to;
    }
  }

  return {
    degreeSlug: courseRoadmap.degreeSlug,
    parallelLanes,
    postMergeSpine: filterTitles(curation.postMergeSpine, scope),
    trunkSpine: filterTitles(curation.trunkSpine ?? [], scope),
    trunkForks,
    capstones: (curation.capstones ?? []).filter((capstone) =>
      titleInScope(capstone.after, scope),
    ),
    branches: filterBranches(curation.branches, scope),
    branchOwnerOverrides,
    spineJoins,
    spinePromotions: filterTitles(curation.spinePromotions ?? [], scope),
    branchLayoutFlips: Object.fromEntries(
      Object.entries(curation.branchLayoutFlips ?? {}).filter(
        ([owner]) => titleInScope(owner, scope),
      ),
    ),
  };
}

export function parseConceptLayoutDocument(
  raw: Record<string, unknown> | null | undefined,
  courseRoadmap: DegreeRoadmap,
): RoadmapCuration | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const merged: RoadmapCuration = {
    ...EMPTY_ROADMAP_CURATION,
    ...(raw as unknown as RoadmapCuration),
    degreeSlug: courseRoadmap.degreeSlug,
  };

  return sliceCurationForCourse(merged, courseRoadmap);
}

export function conceptLayoutDocumentFromCuration(
  curation: RoadmapCuration,
): Record<string, unknown> {
  return structuredClone(curation) as unknown as Record<string, unknown>;
}

export function removeTitleFromCurationSpine(curation: RoadmapCuration, title: string): void {
  curation.postMergeSpine = curation.postMergeSpine.filter((entry) => entry !== title);
  curation.trunkSpine = (curation.trunkSpine ?? []).filter((entry) => entry !== title);
  curation.spinePromotions = (curation.spinePromotions ?? []).filter((entry) => entry !== title);

  for (const lane of curation.parallelLanes) {
    lane.spine = lane.spine.filter((entry) => entry !== title);
  }

  for (const fork of curation.trunkForks ?? []) {
    for (const lane of fork.lanes) {
      lane.spine = lane.spine.filter((entry) => entry !== title);
    }
  }

  for (const [owner, branches] of Object.entries(curation.branches)) {
    curation.branches[owner] = branches.filter((entry) => entry !== title);
  }

  delete curation.branchOwnerOverrides[title];
  delete curation.spineJoins[title];
  for (const [from, to] of Object.entries(curation.spineJoins)) {
    if (to === title) {
      delete curation.spineJoins[from];
    }
  }
}

/** Hang `branchTitle` on the side of `ownerTitle` (removes it from spine lists). */
export function attachConceptAsBranch(
  curation: RoadmapCuration,
  ownerTitle: string,
  branchTitle: string,
): RoadmapCuration {
  if (ownerTitle === branchTitle) {
    return curation;
  }

  const next = structuredClone(curation);
  removeTitleFromCurationSpine(next, branchTitle);

  const branches = next.branches[ownerTitle] ?? [];
  if (!branches.includes(branchTitle)) {
    next.branches[ownerTitle] = [...branches, branchTitle];
  }

  next.branchOwnerOverrides[branchTitle] = ownerTitle;
  delete next.spineJoins[branchTitle];

  return next;
}

/** Merge the dragged concept's spine path into the target on the main trunk. */
export function joinConceptSpinePaths(
  curation: RoadmapCuration,
  fromTitle: string,
  toTitle: string,
): RoadmapCuration {
  if (fromTitle === toTitle) {
    return curation;
  }

  const next = structuredClone(curation);
  next.spineJoins[fromTitle] = toTitle;
  delete next.branchOwnerOverrides[fromTitle];

  const owner = Object.entries(next.branches).find(([, branches]) =>
    branches.includes(fromTitle),
  )?.[0];
  if (owner) {
    next.branches[owner] = next.branches[owner]!.filter((title) => title !== fromTitle);
  }

  return next;
}

const DEFAULT_SNAP_DISTANCE = 140;
const SPINE_SNAP_DISTANCE = 180;

function topicNodeCenter(node: Node): { x: number; y: number } {
  const width = node.width ?? node.measured?.width ?? 0;
  const height = node.height ?? node.measured?.height ?? 0;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function isSpineTopicNode(node: Node): boolean {
  if (node.type !== "roadmapTopic") {
    return false;
  }

  const role = (node.data as { role?: string }).role;
  return role === "spine";
}

/** Nearest spine topic to the reference node (for “shift+click near the spine”). */
export function findNearestSpineTopicNode(
  nodes: Node[],
  referenceNodeId: string,
  maxDistance = SPINE_SNAP_DISTANCE,
): Node | null {
  const reference = nodes.find((node) => node.id === referenceNodeId);
  if (!reference) {
    return null;
  }

  const { x: refX, y: refY } = topicNodeCenter(reference);
  let best: Node | null = null;
  let bestDistance = maxDistance * maxDistance;

  for (const node of nodes) {
    if (!isSpineTopicNode(node)) {
      continue;
    }

    const { x, y } = topicNodeCenter(node);
    const dx = x - refX;
    const dy = y - refY;
    const distance = dx * dx + dy * dy;

    if (distance <= bestDistance) {
      bestDistance = distance;
      best = node;
    }
  }

  return best;
}

export function findNearestFlowNode(
  nodes: Node[],
  centerX: number,
  centerY: number,
  excludeId: string,
  maxDistance = DEFAULT_SNAP_DISTANCE,
): Node | null {
  let best: Node | null = null;
  let bestDistance = maxDistance * maxDistance;

  for (const node of nodes) {
    if (node.id === excludeId || node.type !== "roadmapTopic") {
      continue;
    }

    const width = node.width ?? node.measured?.width ?? 0;
    const height = node.height ?? node.measured?.height ?? 0;
    const nodeCenterX = node.position.x + width / 2;
    const nodeCenterY = node.position.y + height / 2;
    const dx = nodeCenterX - centerX;
    const dy = nodeCenterY - centerY;
    const distance = dx * dx + dy * dy;

    if (distance <= bestDistance) {
      bestDistance = distance;
      best = node;
    }
  }

  return best;
}
