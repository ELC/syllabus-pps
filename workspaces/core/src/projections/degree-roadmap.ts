import { buildCurriculumIndexes } from "../analysis";
import { deriveExpectedCurriculum } from "../curriculum";
import {
  coursesLinkedToYearPage,
  resolveCoursePageTitle,
  yearPagesForDegree,
} from "../degree-year";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, GraphEdge, PageKind, ZettelPage, EdgeKind } from "../types";

import { attachDegreeRoadmapOpen } from "../roadmap/course-concept-roadmap-open";
import type { OpenCourseConceptRoadmap } from "../roadmap/course-concept-roadmap-open";
import type { CurriculumPageSlug, DegreeRoadmapNodeTitle, RoadmapLayoutSlug } from "../roadmap/titles";

export type { DegreeRoadmapNodeTitle } from "../roadmap/titles";

export interface DegreeRoadmapConcept {
  title: DegreeRoadmapNodeTitle;
  slug: CurriculumPageSlug;
  dependsOn: DegreeRoadmapNodeTitle[];
}

export interface DegreeRoadmapData {
  degree: string;
  degreeSlug: RoadmapLayoutSlug;
  concepts: DegreeRoadmapConcept[];
  edges: GraphEdge[];
}

export interface DegreeRoadmap extends DegreeRoadmapData {
  open(): OpenCourseConceptRoadmap;
}

export function reachableFromDegree(graph: CurriculumGraph, degreeTitle: string): Set<string> {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const degreePage = pagesByTitle.get(normalizeTitle(degreeTitle));
  if (!degreePage || degreePage.kind !== PageKind.Degree) {
    return new Set();
  }

  const reachable = new Set<string>([degreePage.title]);
  const queue: string[] = [degreePage.title];

  const degreeYearPages = yearPagesForDegree(graph.pages, degreePage.title, {
    degreeSlug: degreePage.slug,
  });
  const degreeYearTitles = new Set(degreeYearPages.map((page) => page.title));

  for (const yearPage of degreeYearPages) {
    if (!reachable.has(yearPage.title)) {
      reachable.add(yearPage.title);
      queue.push(yearPage.title);
    }
    for (const courseTitle of coursesLinkedToYearPage(yearPage, graph)) {
      if (!reachable.has(courseTitle)) {
        reachable.add(courseTitle);
        queue.push(courseTitle);
      }
    }
  }

  const hasReachableCourse = graph.pages.some(
    (page) => page.kind === PageKind.Course && reachable.has(page.title),
  );
  const expectedYears =
    graph.expected?.years?.length > 0
      ? graph.expected.years
      : deriveExpectedCurriculum(graph.pages).years;
  if (!hasReachableCourse && expectedYears.length > 0) {
    for (const year of expectedYears) {
      if (degreeYearTitles.size > 0 && !degreeYearTitles.has(year.title)) {
        continue;
      }
      for (const courseRef of year.courses) {
        const courseTitle = resolveCoursePageTitle(courseRef, graph.pages);
        if (!courseTitle || reachable.has(courseTitle)) {
          continue;
        }
        reachable.add(courseTitle);
        queue.push(courseTitle);
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const edge of graph.edges) {
      if (edge.kind !== EdgeKind.PageRef && edge.kind !== EdgeKind.ConceptTag) {
        continue;
      }

      if (edge.source !== current || reachable.has(edge.target)) {
        continue;
      }

      reachable.add(edge.target);
      queue.push(edge.target);
    }
  }

  return reachable;
}

function conceptsForDegree(reachable: Set<string>, graph: CurriculumGraph): ZettelPage[] {
  const titles = new Set(
    graph.pages
      .filter((page) => page.kind === PageKind.Concept && reachable.has(page.title))
      .map((page) => page.title),
  );

  return graph.pages
    .filter((page) => titles.has(page.title))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

export function listDegreePages(graph: CurriculumGraph): ZettelPage[] {
  return graph.pages
    .filter((page) => page.kind === PageKind.Degree)
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

export function projectDegreeRoadmap(graph: CurriculumGraph, degreeTitle: string): DegreeRoadmap | null {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const degreePage = pagesByTitle.get(normalizeTitle(degreeTitle));
  if (!degreePage || degreePage.kind !== PageKind.Degree) {
    return null;
  }

  const reachable = reachableFromDegree(graph, degreePage.title);
  const concepts = conceptsForDegree(reachable, graph);

  return attachDegreeRoadmapOpen({
    degree: degreePage.title,
    degreeSlug: degreePage.slug,
    concepts: concepts.map((page) => ({
      title: page.title,
      slug: page.slug,
      dependsOn: [],
    })),
    edges: [],
  });
}

export function projectAllDegreeRoadmaps(graph: CurriculumGraph): DegreeRoadmap[] {
  return listDegreePages(graph)
    .map((degreePage) => projectDegreeRoadmap(graph, degreePage.title))
    .filter((roadmap): roadmap is DegreeRoadmap => roadmap !== null);
}

export function kindRankForRoadmap(kind: PageKind): number {
  switch (kind) {
    case PageKind.Degree:
      return 0;
    case PageKind.Year:
      return 1;
    case PageKind.Course:
      return 2;
    case PageKind.Concept:
      return 3;
    default:
      return 4;
  }
}
