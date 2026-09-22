import { EditErrorCode } from "../errors";
import { EditCommandKind } from "../kinds";
import type { TrunkPath } from "../path";
import { clonePath, replacePathAt } from "../mutate";
import { conceptSegment, parallelSegment, type SpinePath } from "../segment";
import type { ConceptSubgraph } from "../subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { findConceptLocation } from "../traverse";
import { isConceptSegment, isParallelSegment } from "../traverse";
import { allowed, blocked, type MergeForkAdmissibility } from "./admissibility";
import type { MergeForkCommand } from "./commands";

type ParallelHit = {
  readonly pathIndices: TrunkPath;
  readonly path: SpinePath;
  readonly segmentIndex: number;
  readonly laneIndex: number | undefined;
};

function findParallelContaining(
  path: SpinePath,
  title: string,
  pathIndices: TrunkPath = [],
): ParallelHit | undefined {
  for (let segmentIndex = 0; segmentIndex < path.length; segmentIndex += 1) {
    const segment = path[segmentIndex]!;
    if (!isParallelSegment(segment)) {
      continue;
    }

    if (segment.after === title) {
      return { pathIndices, path, segmentIndex, laneIndex: undefined };
    }

    for (let laneIndex = 0; laneIndex < segment.lanes.length; laneIndex += 1) {
      const lane = segment.lanes[laneIndex]!;
      const nested = findParallelContaining(lane, title, [
        ...pathIndices,
        segmentIndex,
        laneIndex,
      ]);
      if (nested) {
        return nested;
      }

      if (lane.some((entry) => isConceptSegment(entry) && entry.title === title)) {
        return { pathIndices, path, segmentIndex, laneIndex };
      }
    }
  }

  return undefined;
}

function countActiveLanes(segment: ReturnType<typeof parallelSegment>): number {
  return segment.lanes.filter((lane) => lane.length > 0).length;
}

function spineOnlyBranchCount(
  path: SpinePath,
  segmentIndex: number,
  after: string,
  merge: string,
): number {
  let count = 0;
  for (let index = 0; index < segmentIndex; index += 1) {
    const entry = path[index];
    if (!entry || !isConceptSegment(entry)) {
      continue;
    }

    if (entry.title === after || entry.title === merge) {
      continue;
    }

    count += 1;
  }

  return count;
}

function parallelBranchCount(path: SpinePath, segmentIndex: number, segment: ReturnType<typeof parallelSegment>): number {
  return spineOnlyBranchCount(path, segmentIndex, segment.after, segment.merge) + countActiveLanes(segment);
}

export function planMergeFork(
  subgraph: ValidatedConceptSubgraph,
  conceptTitle: string,
): MergeForkAdmissibility {
  const location = findConceptLocation(subgraph, conceptTitle);
  if (!location) {
    return blocked({ code: EditErrorCode.MergeForkNotFound });
  }

  const hit = findParallelContaining(subgraph.trunk, conceptTitle);
  if (!hit) {
    return blocked({ code: EditErrorCode.MergeForkNotFound });
  }

  const segment = hit.path[hit.segmentIndex];
  if (!segment || !isParallelSegment(segment)) {
    return blocked({ code: EditErrorCode.MergeForkNotFound });
  }

  const branchCount = parallelBranchCount(hit.path, hit.segmentIndex, segment);
  if (branchCount > 2 && hit.laneIndex === undefined) {
    return blocked({ code: EditErrorCode.MergeForkPickLane });
  }

  return allowed({
    kind: EditCommandKind.MergeFork,
    conceptTitle,
  });
}

function collapseParallelSegment(path: SpinePath, segmentIndex: number): SpinePath {
  const next = clonePath(path);
  const segment = next[segmentIndex];
  if (!segment || !isParallelSegment(segment)) {
    return path;
  }

  const mergedTitles = segment.lanes.flatMap((lane) =>
    lane.flatMap((entry) => (isConceptSegment(entry) ? [entry.title] : [])),
  );

  const middle = mergedTitles.filter(
    (title) => title !== segment.after && title !== segment.merge,
  );
  const replacement: SpinePath = [
    conceptSegment(segment.after),
    ...middle.map((title) => conceptSegment(title)),
    conceptSegment(segment.merge),
  ];
  next.splice(segmentIndex, 1, ...replacement);
  return next;
}

export function applyMergeFork(
  subgraph: ValidatedConceptSubgraph,
  command: MergeForkCommand,
): ValidatedConceptSubgraph {
  const hit = findParallelContaining(subgraph.trunk, command.conceptTitle);
  if (!hit) {
    return subgraph;
  }

  const segment = hit.path[hit.segmentIndex];
  if (!segment || !isParallelSegment(segment)) {
    return subgraph;
  }

  const branchCount = parallelBranchCount(hit.path, hit.segmentIndex, segment);
  if (branchCount <= 2) {
    const collapsed = collapseParallelSegment(hit.path, hit.segmentIndex);
    const trunk =
      hit.pathIndices.length === 0
        ? collapsed
        : replacePathAt(subgraph.trunk, hit.pathIndices, collapsed);
    return markValidated({ ...subgraph, trunk });
  }

  if (hit.laneIndex === undefined) {
    return subgraph;
  }

  const foldIntoIndex = hit.laneIndex > 0 ? hit.laneIndex - 1 : 1;
  const targetLane = segment.lanes[foldIntoIndex];
  const mergedLane = segment.lanes[hit.laneIndex];
  if (!targetLane || !mergedLane) {
    return subgraph;
  }

  const mergedSpine = [
    ...targetLane.flatMap((entry) => (isConceptSegment(entry) ? [entry.title] : [])),
    ...mergedLane.flatMap((entry) => (isConceptSegment(entry) ? [entry.title] : [])),
  ].map((title) => conceptSegment(title));

  const nextLanes = segment.lanes
    .map((lane, index) => {
      if (index === foldIntoIndex) {
        return mergedSpine;
      }

      if (index === hit.laneIndex) {
        return [];
      }

      return lane;
    })
    .filter((lane) => lane.length > 0);

  const nextSegment = parallelSegment(segment.after, segment.merge, nextLanes);
  const next = clonePath(hit.path);
  next[hit.segmentIndex] = nextSegment;

  const trunk =
    hit.pathIndices.length === 0
      ? next
      : replacePathAt(subgraph.trunk, hit.pathIndices, next);

  return markValidated({ ...subgraph, trunk });
}
