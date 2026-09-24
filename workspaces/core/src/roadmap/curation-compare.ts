import type { RoadmapCuration } from "./curation";

/** Fields that define linear concept layout parity. */
export function linearCurationStructuralSnapshot(curation: RoadmapCuration) {
  const curationOpen = curation.open();
  const layoutRead = curationOpen.readLinearLayout();
  if (layoutRead.isSuccess()) {
    const layout = layoutRead.layout;
    return {
      degreeSlug: layout.degreeSlug,
      spine: layout.spine,
      branches: layout.branches,
      branchOwnerOverrides: layout.branchOwnerOverrides,
      spinePromotions: layout.spinePromotions ?? [],
      branchLayoutFlips: layout.branchLayoutFlips ?? {},
    };
  }

  return {
    degreeSlug: curation.degreeSlug,
    parallelLanes: curation.parallelLanes,
    branches: curation.branches,
    branchOwnerOverrides: curation.branchOwnerOverrides,
    spinePromotions: curation.spinePromotions ?? [],
    branchLayoutFlips: curation.branchLayoutFlips ?? {},
  };
}

export function curationsStructurallyEqual(
  left: RoadmapCuration,
  right: RoadmapCuration,
): boolean {
  return (
    JSON.stringify(linearCurationStructuralSnapshot(left)) ===
    JSON.stringify(linearCurationStructuralSnapshot(right))
  );
}
