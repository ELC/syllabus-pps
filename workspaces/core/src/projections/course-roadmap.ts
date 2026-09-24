import { buildCurriculumIndexes } from "../analysis";
import { courseTrayectoForCourseInDegree } from "../degree-year";
import { yearLabelForCourseInDegree } from "../degree-year";
import { normalizeTitle, uniqueSorted } from "../normalize";
import { CourseTrayecto, CurriculumGraph, GraphEdge, ZettelPage, PageKind, EdgeKind } from "../types";
import { attachDegreeRoadmapOpen } from "../roadmap/course-concept-roadmap-open";
import type { CurriculumPageSlug, DegreeRoadmapNodeTitle, RoadmapLayoutSlug } from "../roadmap/titles";
import {
  type DegreeRoadmap,
  type DegreeRoadmapConcept,
  projectDegreeRoadmap,
  reachableFromDegree,
} from "./degree-roadmap";

export interface CourseRoadmapCourse {
  title: DegreeRoadmapNodeTitle;
  slug: CurriculumPageSlug;
  year: string;
  correlativas: DegreeRoadmapNodeTitle[];
  concepts: DegreeRoadmapNodeTitle[];
  trayecto: CourseTrayecto;
}

export interface CourseRoadmap {
  degree: string;
  degreeSlug: RoadmapLayoutSlug;
  courses: CourseRoadmapCourse[];
  edges: GraphEdge[];
}

function coursesForDegree(reachable: Set<string>, graph: CurriculumGraph): ZettelPage[] {
  return graph.pages
    .filter((page) => page.kind === PageKind.Course && reachable.has(page.title))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

export function conceptTitlesLinkedToCourse(
  page: ZettelPage,
  conceptTitles: ReadonlySet<string>,
): string[] {
  return uniqueSorted([
    ...page.tags
      .map((tag) => tag.resolvedTarget ?? tag.target)
      .filter((title) => conceptTitles.has(normalizeTitle(title))),
    ...page.refs
      .map((ref) => ref.resolvedTarget ?? ref.target)
      .filter((title) => conceptTitles.has(normalizeTitle(title))),
  ]);
}

export function projectCourseRoadmap(
  graph: CurriculumGraph,
  degreeTitle: string,
): CourseRoadmap | null {
  const { pagesByTitle, conceptTitles } = buildCurriculumIndexes(graph);
  const degreePage = pagesByTitle.get(normalizeTitle(degreeTitle));
  if (!degreePage || degreePage.kind !== PageKind.Degree) {
    return null;
  }

  const reachable = reachableFromDegree(graph, degreePage.title);
  const courses = coursesForDegree(reachable, graph);
  const courseTitles = new Set(courses.map((page) => page.title));

  const edges = graph.edges.filter(
    (edge) =>
      edge.kind === EdgeKind.CoursePrerequisite &&
      courseTitles.has(edge.source) &&
      courseTitles.has(edge.target),
  );

  return {
    degree: degreePage.title,
    degreeSlug: degreePage.slug,
    courses: courses.map((page) => ({
      title: page.title,
      slug: page.slug,
      year: yearLabelForCourseInDegree(graph, degreePage.title, page.title, degreePage.slug),
      correlativas: uniqueSorted(
        (page.correlativas ?? [])
          .map((correlativa) => correlativa.resolvedTarget ?? correlativa.target)
          .filter((title) => courseTitles.has(title)),
      ),
      concepts: conceptTitlesLinkedToCourse(page, conceptTitles),
      trayecto: courseTrayectoForCourseInDegree(graph, degreePage.title, page.title, degreePage.slug),
    })),
    edges,
  };
}

export function projectAllCourseRoadmaps(graph: CurriculumGraph): CourseRoadmap[] {
  return graph.pages
    .filter((page) => page.kind === PageKind.Degree)
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"))
    .map((degreePage) => projectCourseRoadmap(graph, degreePage.title))
    .filter((roadmap): roadmap is CourseRoadmap => roadmap !== null);
}

export function courseRoadmapAsDegreeRoadmap(roadmap: CourseRoadmap): DegreeRoadmap {
  return attachDegreeRoadmapOpen({
    degree: roadmap.degree,
    degreeSlug: roadmap.degreeSlug,
    concepts: roadmap.courses.map((course) => ({
      title: course.title,
      slug: course.slug,
      dependsOn: course.correlativas,
      trayecto: course.trayecto,
    })),
    edges: roadmap.edges,
  });
}

export function projectCourseConceptRoadmap(
  graph: CurriculumGraph,
  degreeTitle: string,
  courseTitle: string,
): DegreeRoadmap | null {
  const courseRoadmap = projectCourseRoadmap(graph, degreeTitle);
  if (!courseRoadmap) {
    return null;
  }

  const course = courseRoadmap.courses.find(
    (entry) => normalizeTitle(entry.title) === normalizeTitle(courseTitle),
  );
  if (!course) {
    return null;
  }

  const degreeRoadmap = projectDegreeRoadmap(graph, degreeTitle);
  if (!degreeRoadmap) {
    return null;
  }

  const byTitle = new Map(
    degreeRoadmap.concepts.map((concept) => [concept.title, concept] as const),
  );
  /** Concept editor order follows course page links; correlativas are not used here. */
  const concepts: DegreeRoadmapConcept[] = course.concepts.flatMap((title) => {
    const concept = byTitle.get(title);
    if (!concept) {
      return [];
    }

    return [{ ...concept, dependsOn: [] }];
  });

  return attachDegreeRoadmapOpen({
    degree: course.title,
    degreeSlug: course.slug,
    concepts,
    edges: [],
  });
}
