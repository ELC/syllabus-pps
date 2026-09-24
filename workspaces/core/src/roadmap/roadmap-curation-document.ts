import type { RoadmapCuration, RoadmapCurationData } from "./curation";
import { attachRoadmapCurationOpen } from "./roadmap-curation-open";

/** Builds a {@link RoadmapCuration} wire document with {@link RoadmapCuration.open}. */
export function roadmapCuration(data: RoadmapCurationData): RoadmapCuration {
  return attachRoadmapCurationOpen(structuredClone(data));
}

export const EMPTY_ROADMAP_CURATION: RoadmapCuration = roadmapCuration({
  degreeSlug: "",
  parallelLanes: [],
  branches: {},
  branchOwnerOverrides: {},
  spinePromotions: [],
  branchLayoutFlips: {},
});

export function cloneRoadmapCurationData(source: RoadmapCuration): RoadmapCurationData {
  const {
    degreeSlug,
    parallelLanes,
    branches,
    branchOwnerOverrides,
    spinePromotions,
    branchLayoutFlips,
  } = source;

  return structuredClone({
    degreeSlug,
    parallelLanes,
    branches,
    branchOwnerOverrides,
    spinePromotions,
    branchLayoutFlips,
  });
}

/** Ensures parsed/cloned JSON has {@link RoadmapCuration.open}. */
export function ensureRoadmapCurationOpen(curation: RoadmapCuration): RoadmapCuration {
  if (typeof curation.open === "function") {
    return curation;
  }

  return attachRoadmapCurationOpen(cloneRoadmapCurationData(curation));
}
