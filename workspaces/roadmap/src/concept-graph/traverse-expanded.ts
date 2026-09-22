import type { RoadmapCuration, RoadmapTrunkFork } from "../components/roadmap/curation";
import { readCompressedTrunkTitles } from "./codec/compressed-trunk";
import type { ConceptSubgraph } from "./subgraph";
import { isConceptSegment, isParallelSegment, linearEditOrder } from "./traverse";
import type { ParallelSegment, SpinePath } from "./segment";

export function compressedTrunkFromPath(path: SpinePath): string[] {
  const trunk: string[] = [];
  for (const segment of path) {
    if (isConceptSegment(segment)) {
      if (!trunk.includes(segment.title)) {
        trunk.push(segment.title);
      }

      continue;
    }

    if (!trunk.includes(segment.after)) {
      trunk.push(segment.after);
    }

    if (!trunk.includes(segment.merge)) {
      trunk.push(segment.merge);
    }
  }

  return trunk;
}

function parallelSegmentOpeningAt(
  path: SpinePath,
  after: string,
): ParallelSegment | undefined {
  for (const segment of path) {
    if (isParallelSegment(segment) && segment.after === after) {
      return segment;
    }

    if (isParallelSegment(segment)) {
      for (const lane of segment.lanes) {
        const nested = parallelSegmentOpeningAt(lane, after);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return undefined;
}

export function expandedOrderFromTrunkForks(
  compressed: readonly string[],
  forks: readonly RoadmapTrunkFork[],
): string[] {
  const forkByAfter = new Map(forks.map((fork) => [fork.after, fork]));
  const expanded: string[] = [];

  for (const title of compressed) {
    expanded.push(title);
    const fork = forkByAfter.get(title);
    if (!fork) {
      continue;
    }

    for (const laneTitle of fork.lanes.flatMap((lane) => lane.spine)) {
      if (laneTitle !== title) {
        expanded.push(laneTitle);
      }
    }
  }

  return expanded;
}

function expandedOrderFromGraphTrunk(subgraph: ConceptSubgraph): string[] {
  const compressed = compressedTrunkFromPath(subgraph.trunk);
  const expanded: string[] = [];

  for (const title of compressed) {
    expanded.push(title);
    const parallel = parallelSegmentOpeningAt(subgraph.trunk, title);
    if (!parallel) {
      continue;
    }

    for (const lane of parallel.lanes) {
      for (const laneTitle of linearEditOrder(lane)) {
        if (
          laneTitle !== parallel.after &&
          laneTitle !== parallel.merge &&
          !expanded.includes(laneTitle)
        ) {
          expanded.push(laneTitle);
        }
      }
    }
  }

  return expanded;
}

/** Expanded spine order from a curation blob (matches legacy buildExpandedSpineOrder). */
export function expandedCurationOrder(curation: RoadmapCuration): string[] {
  const forks = curation.trunkForks ?? [];
  const compressed = readCompressedTrunkTitles(curation);
  if (forks.length > 0) {
    return expandedOrderFromTrunkForks(compressed, forks);
  }

  const expanded: string[] = [];
  for (const title of compressed) {
    expanded.push(title);
    for (const branchTitle of curation.branches[title] ?? []) {
      if (!compressed.includes(branchTitle) && !expanded.includes(branchTitle)) {
        expanded.push(branchTitle);
      }
    }
  }

  return expanded;
}

/** Expanded spine order for shift (matches legacy buildExpandedSpineOrder on encoded curation). */
export function expandedSubgraphOrder(subgraph: ConceptSubgraph): string[] {
  if (subgraph.meta.sourceCuration) {
    return expandedCurationOrder(subgraph.meta.sourceCuration);
  }

  const forks = subgraph.meta.trunkForks;
  if (forks && forks.length > 0) {
    return expandedOrderFromTrunkForks(
      compressedTrunkFromPath(subgraph.trunk),
      forks,
    );
  }

  return expandedOrderFromGraphTrunk(subgraph);
}

export function titleOnCompressedTrunk(subgraph: ConceptSubgraph, title: string): boolean {
  return compressedTrunkFromPath(subgraph.trunk).includes(title);
}
