import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle, uniqueSorted } from "../normalize";
import { CurriculumGraph, GraphEdge, ZettelPage } from "../types";
import {
  type DegreeRoadmap,
  type DegreeRoadmapConcept,
  projectDegreeRoadmap,
  reachableFromCareer,
} from "./degree-roadmap";

export interface CourseRoadmapCourse {
  title: string;
  slug: string;
  year: string;
  correlativas: string[];
  concepts: string[];
}

export interface CourseRoadmap {
  career: string;
  careerSlug: string;
  courses: CourseRoadmapCourse[];
  edges: GraphEdge[];
}

function coursesForDegree(reachable: Set<string>, graph: CurriculumGraph): ZettelPage[] {
  return graph.pages
    .filter((page) => page.kind === "course" && reachable.has(page.title))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

function conceptsLinkedToCourse(
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
  careerTitle: string,
): CourseRoadmap | null {
  const { pagesByTitle, conceptTitles, yearByCourse } = buildCurriculumIndexes(graph);
  const career = pagesByTitle.get(normalizeTitle(careerTitle));
  if (!career || career.kind !== "career") {
    return null;
  }

  const reachable = reachableFromCareer(graph, career.title);
  const courses = coursesForDegree(reachable, graph);
  const courseTitles = new Set(courses.map((page) => page.title));

  const edges = graph.edges.filter(
    (edge) =>
      edge.kind === "course-prerequisite" &&
      courseTitles.has(edge.source) &&
      courseTitles.has(edge.target),
  );

  return {
    career: career.title,
    careerSlug: career.slug,
    courses: courses.map((page) => ({
      title: page.title,
      slug: page.slug,
      year: yearByCourse.get(page.normalizedTitle) ?? "",
      correlativas: uniqueSorted(
        (page.correlativas ?? [])
          .map((correlativa) => correlativa.resolvedTarget ?? correlativa.target)
          .filter((title) => courseTitles.has(title)),
      ),
      concepts: conceptsLinkedToCourse(page, conceptTitles),
    })),
    edges,
  };
}

export function projectAllCourseRoadmaps(graph: CurriculumGraph): CourseRoadmap[] {
  return graph.pages
    .filter((page) => page.kind === "career")
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"))
    .map((career) => projectCourseRoadmap(graph, career.title))
    .filter((roadmap): roadmap is CourseRoadmap => roadmap !== null);
}

export function courseRoadmapAsDegreeRoadmap(roadmap: CourseRoadmap): DegreeRoadmap {
  return {
    career: roadmap.career,
    careerSlug: roadmap.careerSlug,
    concepts: roadmap.courses.map((course) => ({
      title: course.title,
      slug: course.slug,
      dependsOn: course.correlativas,
    })),
    edges: roadmap.edges,
  };
}

export function projectCourseConceptRoadmap(
  graph: CurriculumGraph,
  careerTitle: string,
  courseTitle: string,
): DegreeRoadmap | null {
  const courseRoadmap = projectCourseRoadmap(graph, careerTitle);
  if (!courseRoadmap) {
    return null;
  }

  const course = courseRoadmap.courses.find(
    (entry) => normalizeTitle(entry.title) === normalizeTitle(courseTitle),
  );
  if (!course) {
    return null;
  }

  const degreeRoadmap = projectDegreeRoadmap(graph, careerTitle);
  if (!degreeRoadmap) {
    return null;
  }

  const conceptTitles = new Set(course.concepts);
  const concepts: DegreeRoadmapConcept[] = degreeRoadmap.concepts
    .filter((concept) => conceptTitles.has(concept.title))
    .map((concept) => ({
      ...concept,
      dependsOn: concept.dependsOn.filter((prerequisite) => conceptTitles.has(prerequisite)),
    }));

  const scopedTitles = new Set(concepts.map((concept) => concept.title));
  const edges = degreeRoadmap.edges.filter(
    (edge) => scopedTitles.has(edge.source) && scopedTitles.has(edge.target),
  );

  return {
    career: course.title,
    careerSlug: course.slug,
    concepts,
    edges,
  };
}
