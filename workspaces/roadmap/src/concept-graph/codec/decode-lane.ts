import type { RoadmapTrunkFork } from "../../components/roadmap/curation";
import { conceptSegment, parallelSegment, type SpinePath, type SpineSegment } from "../segment";
import { isParallelSegment } from "../traverse";

function forkAppliesAtTitle(fork: RoadmapTrunkFork, title: string, scope: ReadonlySet<string>): boolean {
  return fork.after === title && scope.has(fork.mergeInto);
}

function laneContainsTitle(
  lane: RoadmapTrunkFork["lanes"][number],
  title: string,
): boolean {
  return lane.spine.includes(title);
}

/** Fork lanes plus spine-only topics between anchors, in curated spine order. */
function decodeForkLanesInSpineOrder(
  fork: RoadmapTrunkFork,
  betweenAnchors: readonly string[],
  forks: readonly RoadmapTrunkFork[],
): SpinePath[] {
  const consumedLaneRoots = new Set<string>();
  const lanes: SpinePath[] = [];

  const laneTitleSet = new Set(fork.lanes.flatMap((lane) => lane.spine));

  for (const title of betweenAnchors) {
    if (!laneTitleSet.has(title)) {
      continue;
    }

    const forkLane = fork.lanes.find((lane) => laneContainsTitle(lane, title));
    if (forkLane) {
      if (!consumedLaneRoots.has(forkLane.root)) {
        lanes.push(decodeOrderedTitlesToPath(forkLane.spine, forks));
        consumedLaneRoots.add(forkLane.root);
      }
    }
  }

  for (const lane of fork.lanes) {
    if (consumedLaneRoots.has(lane.root)) {
      continue;
    }

    lanes.push(decodeOrderedTitlesToPath(lane.spine, forks));
  }

  return lanes;
}

function nestedForksForScope(
  forks: readonly RoadmapTrunkFork[],
  scopeTitles: readonly string[],
): RoadmapTrunkFork[] {
  const scope = new Set(scopeTitles);
  return forks.filter((fork) => scope.has(fork.after) && scope.has(fork.mergeInto));
}

export function decodeOrderedTitlesToPath(
  orderedTitles: readonly string[],
  forks: readonly RoadmapTrunkFork[],
): SpinePath {
  if (orderedTitles.length === 0) {
    return [];
  }

  const scope = new Set(orderedTitles);
  const scopedForks = nestedForksForScope(forks, orderedTitles);
  const forkByAfter = new Map(scopedForks.map((fork) => [fork.after, fork]));
  const segments: SpineSegment[] = [];
  let index = 0;

  while (index < orderedTitles.length) {
    const title = orderedTitles[index]!;
    const fork = forkByAfter.get(title);

    if (fork && forkAppliesAtTitle(fork, title, scope)) {
      const mergeIndex = orderedTitles.indexOf(fork.mergeInto);
      if (mergeIndex > index) {
        const between = orderedTitles.slice(index + 1, mergeIndex);
        const laneTitleSet = new Set(fork.lanes.flatMap((lane) => lane.spine));
        segments.push(conceptSegment(title));
        for (const mid of between) {
          if (!laneTitleSet.has(mid)) {
            segments.push(conceptSegment(mid));
          }
        }

        const lanes = decodeForkLanesInSpineOrder(fork, between, forks);
        segments.push(parallelSegment(fork.after, fork.mergeInto, lanes));
        index = mergeIndex + 1;
        continue;
      }
    }

    segments.push(conceptSegment(title));
    index += 1;
  }

  return segments;
}

export function decodeLinearSpineToPath(
  spine: readonly string[],
  forks: readonly RoadmapTrunkFork[],
): SpinePath {
  const path = decodeOrderedTitlesToPath(spine, forks);
  return path.filter((segment) => {
    if (!isParallelSegment(segment)) {
      return true;
    }

    return segment.lanes.length > 0;
  });
}
