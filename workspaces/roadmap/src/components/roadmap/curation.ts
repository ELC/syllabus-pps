import type { DegreeRoadmap, RoadmapCuration } from "@pps/core";

function assertKnownTitle(titles: Set<string>, title: string, context: string): void {
  if (!titles.has(title)) {
    throw new Error(`Roadmap curation references unknown concept "${title}" in ${context}.`);
  }
}

/** Ensures curation titles exist on the projected degree roadmap. */
export function validateRoadmapCuration(
  roadmap: DegreeRoadmap,
  curation: RoadmapCuration,
): void {
  if (curation.degreeSlug !== roadmap.degreeSlug) {
    throw new Error(
      `Roadmap curation slug "${curation.degreeSlug}" does not match degree "${roadmap.degreeSlug}".`,
    );
  }

  const titles = new Set(roadmap.concepts.map((concept) => concept.title));

  for (const lane of curation.parallelLanes) {
    assertKnownTitle(titles, lane.root, `parallel lane root for ${roadmap.degreeSlug}`);
    for (const title of lane.spine) {
      assertKnownTitle(titles, title, `parallel lane spine for ${roadmap.degreeSlug}`);
    }
  }

  for (const [owner, branches] of Object.entries(curation.branches)) {
    assertKnownTitle(titles, owner, `branch owner for ${roadmap.degreeSlug}`);
    for (const branch of branches) {
      assertKnownTitle(titles, branch, `branch of ${owner} for ${roadmap.degreeSlug}`);
    }
  }

  for (const [branch, owner] of Object.entries(curation.branchOwnerOverrides)) {
    assertKnownTitle(titles, branch, `branch owner override for ${roadmap.degreeSlug}`);
    assertKnownTitle(titles, owner, `branch owner override target for ${roadmap.degreeSlug}`);
  }

  for (const title of curation.spinePromotions ?? []) {
    assertKnownTitle(titles, title, `spine promotion for ${roadmap.degreeSlug}`);
  }
}
