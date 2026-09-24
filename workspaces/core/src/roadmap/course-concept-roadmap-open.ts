import type {
  DegreeRoadmap,
  DegreeRoadmapData,
} from "../projections/degree-roadmap";
import type { ReadonlyRoadmapConceptTitleSet, RoadmapConceptTitle } from "./titles";

/** Colocated view of a course concept subgraph ({@link DegreeRoadmap}). */
export interface OpenCourseConceptRoadmap {
  readonly roadmap: DegreeRoadmap;
  conceptTitleScope(): ReadonlyRoadmapConceptTitleSet;
  conceptSpineFromPageOrder(): RoadmapConceptTitle[];
}

export function createOpenCourseConceptRoadmap(
  roadmap: DegreeRoadmap,
): OpenCourseConceptRoadmap {
  return {
    roadmap,
    conceptTitleScope(): ReadonlyRoadmapConceptTitleSet {
      return new Set(roadmap.concepts.map((concept) => concept.title));
    },
    conceptSpineFromPageOrder(): RoadmapConceptTitle[] {
      return roadmap.concepts.map((concept) => concept.title);
    },
  };
}

export function attachDegreeRoadmapOpen(data: DegreeRoadmapData): DegreeRoadmap {
  const roadmap = data as DegreeRoadmap;
  roadmap.open = function open(this: DegreeRoadmap): OpenCourseConceptRoadmap {
    return createOpenCourseConceptRoadmap(this);
  };
  return roadmap;
}

/** Builds a {@link DegreeRoadmap} with {@link DegreeRoadmap.open}. */
export function degreeRoadmap(data: DegreeRoadmapData): DegreeRoadmap {
  return attachDegreeRoadmapOpen({
    degree: data.degree,
    degreeSlug: data.degreeSlug,
    concepts: data.concepts.map((concept) => ({ ...concept, dependsOn: [...concept.dependsOn] })),
    edges: [...data.edges],
  });
}

