import type {
  RoadmapCuration,
  RoadmapParallelLane,
  RoadmapTrunkFork,
} from "../../components/roadmap/curation";
import { StorageMode } from "../kinds";
import type { ConceptSegment, ParallelSegment, SpinePath, SpineSegment } from "../segment";
import type { ConceptSubgraph } from "../subgraph";
import type { ValidatedConceptSubgraph } from "../validated";
import { isConceptSegment, isParallelSegment } from "../traverse";

function laneSpineFromPath(path: SpinePath): string[] {
  return path.flatMap((segment) => segmentTitles(segment));
}

function segmentTitles(segment: SpineSegment): string[] {
  if (isConceptSegment(segment)) {
    return [segment.title];
  }

  const nested = segment.lanes.flatMap((lane) => laneSpineFromPath(lane));
  const titles: string[] = [];
  if (!nested.includes(segment.after)) {
    titles.push(segment.after);
  }

  for (const title of nested) {
    if (!titles.includes(title)) {
      titles.push(title);
    }
  }

  if (!titles.includes(segment.merge)) {
    titles.push(segment.merge);
  }

  return titles;
}

function collectForks(path: SpinePath, out: RoadmapTrunkFork[]): void {
  for (const segment of path) {
    if (!isParallelSegment(segment)) {
      continue;
    }

    const lanes: RoadmapParallelLane[] = segment.lanes.map((lane) => {
      const spine = laneSpineFromPath(lane);
      return { root: spine[0] ?? segment.after, spine };
    });

    out.push({
      after: segment.after,
      mergeInto: segment.merge,
      lanes,
    });

    for (const lane of segment.lanes) {
      collectForks(lane, out);
    }
  }
}

function compressedTrunkFromPath(path: SpinePath): string[] {
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

export function encodeSubgraph(subgraph: ValidatedConceptSubgraph): RoadmapCuration {
  const trunkForks: RoadmapTrunkFork[] = [];
  collectForks(subgraph.trunk, trunkForks);

  const compressedTrunk = compressedTrunkFromPath(subgraph.trunk);
  const parallelRoot =
    subgraph.meta.parallelLaneRoot ||
    compressedTrunk[0] ||
    (subgraph.trunk[0] ? segmentTitle(subgraph.trunk[0]!) : "");

  const curation: RoadmapCuration = {
    degreeSlug: subgraph.degreeSlug,
    parallelLanes:
      parallelRoot.length > 0
        ? [{ root: parallelRoot, spine: [parallelRoot] }]
        : [],
    postMergeSpine: [],
    branches: Object.fromEntries(
      Object.entries(subgraph.laterals).map(([owner, items]) => [owner, [...items]]),
    ),
    branchOwnerOverrides: { ...subgraph.meta.branchOwnerOverrides },
    spineJoins: { ...subgraph.meta.spineJoins },
  };

  if (subgraph.meta.spinePromotions.length > 0) {
    curation.spinePromotions = [...subgraph.meta.spinePromotions];
  }

  if (Object.keys(subgraph.meta.branchLayoutFlips).length > 0) {
    curation.branchLayoutFlips = { ...subgraph.meta.branchLayoutFlips };
  }

  const useTrunkSpineField =
    subgraph.meta.trunkSpineField === "titles" ||
    subgraph.meta.trunkSpineField === "empty" ||
    subgraph.meta.storageMode === StorageMode.TrunkExplicit;

  if (!useTrunkSpineField && trunkForks.length === 0) {
    if (curation.parallelLanes[0]) {
      curation.parallelLanes[0]!.spine =
        compressedTrunk.length > 0 ? compressedTrunk : laneSpineFromPath(subgraph.trunk);
    }

    return curation;
  }

  if (!useTrunkSpineField && trunkForks.length > 0) {
    if (curation.parallelLanes[0]) {
      curation.parallelLanes[0]!.spine = compressedTrunk;
      curation.parallelLanes[0]!.root = parallelRoot;
    }

    curation.trunkForks = trunkForks;
    return curation;
  }

  if (subgraph.meta.trunkSpineField === "empty" && trunkForks.length === 0) {
    curation.trunkSpine = [];
    if (curation.parallelLanes[0]) {
      curation.parallelLanes[0]!.spine =
        compressedTrunk.length > 0 ? compressedTrunk : laneSpineFromPath(subgraph.trunk);
    }

    return curation;
  }

  curation.trunkSpine = compressedTrunk;
  curation.trunkForks = trunkForks;
  if (curation.parallelLanes[0] && compressedTrunk[0]) {
    curation.parallelLanes[0]!.spine = [parallelRoot];
  }

  return curation;
}

function segmentTitle(segment: SpineSegment): string {
  if (isConceptSegment(segment)) {
    return segment.title;
  }

  return segment.after;
}
