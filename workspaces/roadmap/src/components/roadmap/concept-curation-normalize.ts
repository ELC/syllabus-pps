import {
  attachRoadmapCurationOpen,
  cloneRoadmapCurationData,
  conceptTitleScopeForCourse,
  curationsStructurallyEqual,
  EMPTY_ROADMAP_CURATION,
  roadmapCuration,
  type DegreeRoadmap,
  type RoadmapCuration,
} from "@pps/core";

import { sliceCurationForCourse } from "./concept-curation";

export interface NormalizeLinearCourseResult {
  curation: RoadmapCuration;
  changed: boolean;
  warnings: string[];
}

/**
 * Ensures a course concept layout document is canonical (single parallel lane).
 * Entry: {@link openRoadmapCurationLinearNormalization}.
 */
export interface RoadmapCurationLinearNormalization {
  readonly input: RoadmapCuration;
  forCourse(courseRoadmap: DegreeRoadmap): NormalizeLinearCourseResult;
}

export function openRoadmapCurationLinearNormalization(
  input: RoadmapCuration,
): RoadmapCurationLinearNormalization {
  return {
    input,
    forCourse(courseRoadmap) {
      let working = sliceCurationForCourse(
        attachRoadmapCurationOpen(cloneRoadmapCurationData(input)),
        courseRoadmap,
      );
      working.degreeSlug = courseRoadmap.degreeSlug;

      const wire = working.open();
      const conceptScope = conceptTitleScopeForCourse(courseRoadmap.open().conceptTitleScope());
      const normalized = wire.withDirectSpineStorage(
        wire.resolveLinearSpineForScope(conceptScope),
      );

      const changed = !curationsStructurallyEqual(input, normalized);
      return { curation: normalized, changed, warnings: [] };
    },
  };
}

/** First-time course concept map when `roadmap_concept_layouts` has no row. */
export function bootstrapConceptLayoutForCourse(
  courseRoadmap: DegreeRoadmap,
): RoadmapCuration {
  const courseOpen = courseRoadmap.open();
  const spineFromPage = courseOpen.conceptSpineFromPageOrder();
  if (spineFromPage.length === 0) {
    const emptyData = cloneRoadmapCurationData(EMPTY_ROADMAP_CURATION);
    emptyData.degreeSlug = courseRoadmap.degreeSlug;
    return roadmapCuration(emptyData);
  }

  const seedDocument = roadmapCuration({
    degreeSlug: courseRoadmap.degreeSlug,
    parallelLanes: [{ root: spineFromPage[0]!, spine: [...spineFromPage] }],
    branches: {},
    branchOwnerOverrides: {},
  });

  return openRoadmapCurationLinearNormalization(seedDocument).forCourse(courseRoadmap).curation;
}
