import { EditErrorCode } from "../errors";
import { EditCommandKind, LocationArea, ShiftDirection } from "../kinds";
import { clonePath, replacePathAt } from "../mutate";
import {
  conceptSegment,
  parallelSegment,
  type SpinePath,
  type SpineSegment,
} from "../segment";
import type { ConceptSubgraph } from "../subgraph";
import { findConceptLocation, isConceptSegment, isParallelSegment } from "../traverse";
import {
  expandedSubgraphOrder,
  titleOnCompressedTrunk,
} from "../traverse-expanded";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { allowed, blocked, type ShiftAdmissibility } from "./admissibility";
import type { ShiftCommand } from "./commands";
import { findSpinePathContextForTitles } from "./path-context";

export function planShiftNative(
  subgraph: ValidatedConceptSubgraph,
  title: string,
  direction: ShiftDirection,
): ShiftAdmissibility {
  const order = expandedSubgraphOrder(subgraph);
  const index = order.indexOf(title);
  if (index < 0) {
    return blocked({ code: EditErrorCode.ConceptNotInSubgraph });
  }

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= order.length) {
    return blocked({ code: EditErrorCode.ShiftNoNeighbor });
  }

  const swapWith = order[targetIndex]!;
  return allowed({
    kind: EditCommandKind.Shift,
    title,
    direction,
    swapWith,
  });
}

function swapTitlesInPath(path: SpinePath, left: string, right: string): SpinePath {
  const next = clonePath(path);
  for (let segmentIndex = 0; segmentIndex < next.length; segmentIndex += 1) {
    const segment = next[segmentIndex]!;
    if (isConceptSegment(segment)) {
      if (segment.title === left) {
        next[segmentIndex] = conceptSegment(right);
      } else if (segment.title === right) {
        next[segmentIndex] = conceptSegment(left);
      }

      continue;
    }

    next[segmentIndex] = parallelSegment(
      segment.after,
      segment.merge,
      segment.lanes.map((lane) => swapTitlesInPath(lane, left, right)),
    );
  }

  return next;
}

function listParallelSegments(path: SpinePath) {
  const out: ReturnType<typeof parallelSegment>[] = [];
  for (const segment of path) {
    if (isParallelSegment(segment)) {
      out.push(segment);
      for (const lane of segment.lanes) {
        out.push(...listParallelSegments(lane));
      }
    }
  }

  return out;
}

function removeTitleFromPath(path: SpinePath, title: string): SpinePath {
  const next: SpineSegment[] = [];
  for (const segment of path) {
    if (isConceptSegment(segment)) {
      if (segment.title !== title) {
        next.push(segment);
      }

      continue;
    }

    next.push(
      parallelSegment(
        segment.after,
        segment.merge,
        segment.lanes.map((lane) => removeTitleFromPath(lane, title)),
      ),
    );
  }

  return next;
}

function removeFromLaterals(
  laterals: ConceptSubgraph["laterals"],
  title: string,
): ConceptSubgraph["laterals"] {
  const next: Record<string, string[]> = {};
  for (const [owner, branches] of Object.entries(laterals)) {
    const filtered = branches.filter((entry) => entry !== title);
    if (filtered.length > 0) {
      next[owner] = filtered;
    }
  }

  return next;
}

function insertBeforeTitle(path: SpinePath, anchor: string, title: string): SpinePath {
  const next: SpineSegment[] = [];
  let inserted = false;

  for (const segment of path) {
    if (!inserted && isConceptSegment(segment) && segment.title === anchor) {
      next.push(conceptSegment(title));
      next.push(segment);
      inserted = true;
      continue;
    }

    if (!inserted && isParallelSegment(segment) && segment.merge === anchor) {
      next.push(
        parallelSegment(
          segment.after,
          segment.merge,
          segment.lanes.map((lane) => insertBeforeTitle(lane, anchor, title)),
        ),
      );
      inserted = true;
      continue;
    }

    if (isParallelSegment(segment)) {
      next.push(
        parallelSegment(
          segment.after,
          segment.merge,
          segment.lanes.map((lane) => insertBeforeTitle(lane, anchor, title)),
        ),
      );
    } else {
      next.push(segment);
    }
  }

  if (!inserted) {
    next.push(conceptSegment(title));
  }

  return next;
}

function moveTopicBeforeMergeAnchor(
  subgraph: ConceptSubgraph,
  title: string,
  mergeAnchor: string,
): ConceptSubgraph | undefined {
  const location = findConceptLocation(subgraph, title);
  if (!location || location.area !== LocationArea.Trunk) {
    return undefined;
  }

  const mergeContext = findSpinePathContextForTitles(subgraph, mergeAnchor, mergeAnchor);
  if (!mergeContext) {
    return undefined;
  }

  const without = {
    ...subgraph,
    trunk: removeTitleFromPath(subgraph.trunk, title),
    laterals: removeFromLaterals(subgraph.laterals, title),
  };
  const updatedPath = insertBeforeTitle(mergeContext.path, mergeAnchor, title);
  const trunk =
    mergeContext.pathIndices.length === 0
      ? updatedPath
      : replacePathAt(without.trunk, mergeContext.pathIndices, updatedPath);

  return { ...without, trunk };
}

function swapCompressedTrunkPair(
  subgraph: ValidatedConceptSubgraph,
  left: string,
  right: string,
): ValidatedConceptSubgraph {
  const context = findSpinePathContextForTitles(subgraph, left, right);
  if (!context || !titleOnCompressedTrunk(subgraph, left) || !titleOnCompressedTrunk(subgraph, right)) {
    return subgraph;
  }

  const swapped = swapTitlesInPath(context.path, left, right);
  const trunk =
    context.pathIndices.length === 0
      ? swapped
      : replacePathAt(subgraph.trunk, context.pathIndices, swapped);

  return markValidated({
    ...subgraph,
    trunk,
    meta: { ...subgraph.meta, sourceCuration: undefined },
  });
}

export function applyShiftNative(
  subgraph: ValidatedConceptSubgraph,
  command: ShiftCommand,
): ValidatedConceptSubgraph {
  const { title, swapWith, direction } = command;

  if (
    titleOnCompressedTrunk(subgraph, title) &&
    titleOnCompressedTrunk(subgraph, swapWith)
  ) {
    return swapCompressedTrunkPair(subgraph, title, swapWith);
  }

  if (
    direction === ShiftDirection.Up &&
    findConceptLocation(subgraph, title)?.area === LocationArea.Trunk
  ) {
    const mergeFork = listParallelSegments(subgraph.trunk).find(
      (segment) => segment.merge === swapWith,
    );
    const titleInDownstreamLane = mergeFork
      ? mergeFork.lanes.some((lane) =>
          lane.some(
            (segment) => isConceptSegment(segment) && segment.title === title,
          ),
        )
      : false;

    if (mergeFork && titleInDownstreamLane) {
      const moved = moveTopicBeforeMergeAnchor(subgraph, title, swapWith);
      if (moved) {
        return markValidated({
          ...moved,
          meta: { ...moved.meta, sourceCuration: undefined },
        });
      }
    }
  }

  const context = findSpinePathContextForTitles(subgraph, title, swapWith);
  if (!context) {
    return subgraph;
  }

  const swapped = swapTitlesInPath(context.path, title, swapWith);
  const trunk =
    context.pathIndices.length === 0
      ? swapped
      : replacePathAt(subgraph.trunk, context.pathIndices, swapped);

  return markValidated({
    ...subgraph,
    trunk,
    meta: { ...subgraph.meta, sourceCuration: undefined },
  });
}
