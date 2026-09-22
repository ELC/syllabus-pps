import type { RoadmapCuration } from "../../components/roadmap/curation";

/** Compare curations ignoring object identity (for native vs legacy parity checks). */
export function curationStructuralSnapshot(curation: RoadmapCuration) {
  return {
    trunkSpine: curation.trunkSpine,
    parallelLanes: curation.parallelLanes,
    trunkForks: curation.trunkForks ?? [],
    branches: curation.branches,
    spinePromotions: curation.spinePromotions,
    spineJoins: curation.spineJoins,
    branchOwnerOverrides: curation.branchOwnerOverrides,
  };
}

export function curationsStructurallyEqual(
  left: RoadmapCuration,
  right: RoadmapCuration,
): boolean {
  return (
    JSON.stringify(curationStructuralSnapshot(left)) ===
    JSON.stringify(curationStructuralSnapshot(right))
  );
}
