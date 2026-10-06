import { buildCurriculumIndexes } from "./analysis";
import {
  courseTitlesNoEstructuradoOnYearPage,
  courseTitlesOnYearPage,
  resolveCoursePageTitle,
  yearPagesForDegree,
} from "./degree-year";
import { normalizeTitle, uniqueSorted } from "./normalize";
import {
  CourseCorrelativa,
  CurriculumGraph,
  EdgeKind,
  GraphEdge,
  PageKind,
  ZettelPage,
} from "./types";

function courseSlugsOnYearPage(page: ZettelPage): string[] {
  const slugs = new Set<string>();
  for (const field of ["courses", "coursesNoEstructurado"] as const) {
    for (const ref of page[field] ?? []) {
      const label = ref.resolvedTarget ?? ref.target;
      if (typeof label === "string" && label.trim().length > 0) {
        slugs.add(label.trim());
      }
    }
  }
  return [...slugs];
}

function resolveCourseSlugToTitle(slug: string, pages: readonly ZettelPage[]): string | null {
  const normalizedSlug = normalizeTitle(slug);
  const bySlug = pages.find(
    (page) => page.kind === PageKind.Course && normalizeTitle(page.slug) === normalizedSlug,
  );
  if (bySlug) {
    return bySlug.title;
  }
  return resolveCoursePageTitle(slug, pages) ?? null;
}

export function findYearPageListingCourse(
  graph: CurriculumGraph,
  degreeTitle: string,
  courseTitle: string,
  degreeSlug?: string,
): ZettelPage | null {
  for (const yearPage of yearPagesForDegree(graph.pages, degreeTitle, { degreeSlug })) {
    const listed =
      courseTitlesOnYearPage(yearPage).some(
        (title) => normalizeTitle(title) === normalizeTitle(courseTitle),
      ) ||
      courseTitlesNoEstructuradoOnYearPage(yearPage).some(
        (title) => normalizeTitle(title) === normalizeTitle(courseTitle),
      );
    if (listed) {
      return yearPage;
    }
  }
  return null;
}

function correlativasFromYearPage(
  yearPage: ZettelPage,
  courseSlug: string,
): CourseCorrelativa[] | undefined {
  const normalizedSlug = normalizeTitle(courseSlug);
  if (!yearPage.courseCorrelativas) {
    return undefined;
  }

  for (const [slug, correlativas] of Object.entries(yearPage.courseCorrelativas)) {
    if (normalizeTitle(slug) === normalizedSlug) {
      return correlativas;
    }
  }

  return undefined;
}

export function courseSlugOnYearPage(yearPage: ZettelPage, courseTitle: string, pages: readonly ZettelPage[]): string | null {
  const coursePage = pages.find(
    (page) => page.kind === PageKind.Course && normalizeTitle(page.title) === normalizeTitle(courseTitle),
  );
  if (!coursePage) {
    return null;
  }

  for (const slug of courseSlugsOnYearPage(yearPage)) {
    const title = resolveCourseSlugToTitle(slug, pages);
    if (title && normalizeTitle(title) === normalizeTitle(courseTitle)) {
      return coursePage.slug;
    }
  }

  return coursePage.slug;
}

/** Declared prerequisite course titles for one course within a degree plan (year pages). */
export function correlativasForCourseInDegree(
  graph: CurriculumGraph,
  degreeTitle: string,
  courseTitle: string,
  degreeSlug?: string,
): string[] {
  const yearPage = findYearPageListingCourse(graph, degreeTitle, courseTitle, degreeSlug);
  if (!yearPage) {
    return [];
  }

  const courseSlug = courseSlugOnYearPage(yearPage, courseTitle, graph.pages);
  if (!courseSlug) {
    return [];
  }

  const correlativas = correlativasFromYearPage(yearPage, courseSlug);
  if (!correlativas) {
    return [];
  }

  return uniqueSorted(
    correlativas
      .map((entry) => entry.resolvedTarget ?? entry.target)
      .filter((title): title is string => typeof title === "string" && title.length > 0),
  );
}

export function courseTitlesInDegree(graph: CurriculumGraph, degreeTitle: string, degreeSlug?: string): Set<string> {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const titles = new Set<string>();

  for (const yearPage of yearPagesForDegree(graph.pages, degreeTitle, { degreeSlug })) {
    for (const title of [
      ...courseTitlesOnYearPage(yearPage),
      ...courseTitlesNoEstructuradoOnYearPage(yearPage),
    ]) {
      titles.add(title);
      const page = pagesByTitle.get(normalizeTitle(title));
      if (page?.kind === PageKind.Course) {
        titles.add(page.title);
      }
    }
  }

  return titles;
}

export function buildCoursePrerequisiteEdgesFromYearPages(pages: readonly ZettelPage[]): GraphEdge[] {
  const titleSet = new Set(pages.map((page) => page.title));
  const edges: GraphEdge[] = [];

  for (const page of pages) {
    if (page.kind !== PageKind.Year || !page.courseCorrelativas) {
      continue;
    }

    for (const [courseSlug, correlativas] of Object.entries(page.courseCorrelativas)) {
      const courseTitle = resolveCourseSlugToTitle(courseSlug, pages);
      if (!courseTitle || !titleSet.has(courseTitle)) {
        continue;
      }

      for (const correlativa of correlativas) {
        const prerequisite = correlativa.resolvedTarget ?? correlativa.target;
        if (!titleSet.has(prerequisite)) {
          continue;
        }

        edges.push({
          source: prerequisite,
          target: courseTitle,
          kind: EdgeKind.CoursePrerequisite,
          rawTarget: correlativa.target,
          line: 0,
        });
      }
    }
  }

  return edges;
}

/** Prerequisite edges declared on year pages for one degree (ignores other degrees' courseCorrelativas). */
export function buildCoursePrerequisiteEdgesForDegree(
  graph: CurriculumGraph,
  degreeTitle: string,
  degreeSlug?: string,
): GraphEdge[] {
  const yearPages = yearPagesForDegree(graph.pages, degreeTitle, { degreeSlug });
  const titleSet = new Set(graph.pages.map((page) => page.title));
  const edges: GraphEdge[] = [];

  for (const page of yearPages) {
    if (!page.courseCorrelativas) {
      continue;
    }

    for (const [courseSlug, correlativas] of Object.entries(page.courseCorrelativas)) {
      const courseTitle = resolveCourseSlugToTitle(courseSlug, graph.pages);
      if (!courseTitle || !titleSet.has(courseTitle)) {
        continue;
      }

      for (const correlativa of correlativas) {
        const prerequisite = correlativa.resolvedTarget ?? correlativa.target;
        if (!titleSet.has(prerequisite)) {
          continue;
        }

        edges.push({
          source: prerequisite,
          target: courseTitle,
          kind: EdgeKind.CoursePrerequisite,
          rawTarget: correlativa.target,
          line: 0,
        });
      }
    }
  }

  return edges;
}
