import { normalizeTitle, uniqueSorted } from "./normalize";
import { CurriculumGraph, GraphEdge, ZettelPage, PageKind, EdgeKind } from "./types";

const YEAR_SLUG_PATTERN = /^(.+)-ano-(\d+)$/i;
const LEGACY_YEAR_SLUG_PATTERN = /^ano-(\d+)$/i;

export function buildYearSlug(degreeSlug: string, yearIndex: number): string {
  return `${degreeSlug}-ano-${yearIndex}`;
}

export function parseYearSlug(slug: string): { degreeSlug: string; yearIndex: number } | null {
  const match = slug.match(YEAR_SLUG_PATTERN);
  if (!match) {
    return null;
  }
  const degreeSlug = match[1]?.trim();
  const yearIndex = Number(match[2]);
  if (!degreeSlug || !Number.isInteger(yearIndex) || yearIndex < 1) {
    return null;
  }
  return { degreeSlug, yearIndex };
}

export function parseLegacyYearSlug(slug: string): number | null {
  const match = slug.match(LEGACY_YEAR_SLUG_PATTERN);
  if (!match) {
    return null;
  }
  const yearIndex = Number(match[1]);
  return Number.isInteger(yearIndex) && yearIndex >= 1 ? yearIndex : null;
}

export function resolveYearIndex(page: ZettelPage): number | undefined {
  if (page.yearIndex !== undefined && page.yearIndex > 0) {
    return page.yearIndex;
  }
  const fromSlug = parseYearSlug(page.slug)?.yearIndex ?? parseLegacyYearSlug(page.slug);
  return fromSlug ?? undefined;
}

export function yearDisplayLabel(yearIndex: number): string {
  return `año ${yearIndex}`;
}

/** Unique stored title for a degree-scoped year page. */
export function buildYearPageTitle(degreeTitle: string, yearIndex: number): string {
  return `${degreeTitle} · ${yearDisplayLabel(yearIndex)}`;
}

export function pageDisplayLabel(page: ZettelPage): string {
  const yearIndex = resolveYearIndex(page);
  if (page.kind === PageKind.Year && yearIndex !== undefined) {
    return yearDisplayLabel(yearIndex);
  }
  return page.title;
}

export function resolveDegreeTitle(page: ZettelPage): string | undefined {
  return page.degree?.resolvedTarget ?? page.degree?.target;
}

export function yearPagesForDegree(
  pages: readonly ZettelPage[],
  degreeTitle: string,
  options?: { degreeSlug?: string },
): ZettelPage[] {
  const normalizedDegree = normalizeTitle(degreeTitle);
  const degreeSlugNorm = options?.degreeSlug ? normalizeTitle(options.degreeSlug) : undefined;
  const degreePages = pages.filter((page) => page.kind === PageKind.Degree);
  const singleDegree = degreePages.length === 1 ? degreePages[0] : undefined;

  return pages
    .filter((page) => {
      if (page.kind !== PageKind.Year) {
        return false;
      }

      const linkedDegree = resolveDegreeTitle(page);
      if (linkedDegree && normalizeTitle(linkedDegree) === normalizedDegree) {
        return true;
      }

      const parsedSlug = parseYearSlug(page.slug);
      if (
        parsedSlug &&
        degreeSlugNorm &&
        normalizeTitle(parsedSlug.degreeSlug) === degreeSlugNorm
      ) {
        return true;
      }

      if (
        singleDegree &&
        normalizeTitle(singleDegree.title) === normalizedDegree &&
        parseLegacyYearSlug(page.slug) !== null
      ) {
        return true;
      }

      return false;
    })
    .sort((left, right) => (resolveYearIndex(left) ?? 0) - (resolveYearIndex(right) ?? 0));
}

export function courseTitlesOnYearPage(page: ZettelPage): string[] {
  if (page.kind !== PageKind.Year || !page.courses) {
    return [];
  }
  return page.courses
    .map((course) => {
      if (typeof course === "string") {
        return course;
      }
      return course.resolvedTarget ?? course.target;
    })
    .filter((title): title is string => typeof title === "string" && title.length > 0);
}

function courseLookupMaps(pages: readonly ZettelPage[]): {
  pagesByNormalizedTitle: Map<string, ZettelPage>;
  courseByNormalizedSlug: Map<string, ZettelPage>;
} {
  const pagesByNormalizedTitle = new Map(pages.map((page) => [page.normalizedTitle, page]));
  const courseByNormalizedSlug = new Map<string, ZettelPage>();
  for (const page of pages) {
    if (page.kind === PageKind.Course) {
      courseByNormalizedSlug.set(normalizeTitle(page.slug), page);
    }
  }
  return { pagesByNormalizedTitle, courseByNormalizedSlug };
}

/** Resolve a course frontmatter entry (title or slug) to the canonical course page title. */
export function resolveCoursePageTitle(
  ref: string,
  pages: readonly ZettelPage[],
): string | undefined {
  const { pagesByNormalizedTitle, courseByNormalizedSlug } = courseLookupMaps(pages);
  const normalized = normalizeTitle(ref);
  const byTitle = pagesByNormalizedTitle.get(normalized);
  if (byTitle?.kind === PageKind.Course) {
    return byTitle.title;
  }
  return courseByNormalizedSlug.get(normalized)?.title;
}

function legacyCourseTitlesFromYearRefs(
  yearPage: ZettelPage,
  pagesByNormalizedTitle: ReadonlyMap<string, ZettelPage>,
): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();

  for (const ref of yearPage.refs) {
    const normalized = normalizeTitle(ref.resolvedTarget ?? ref.target);
    const targetPage = pagesByNormalizedTitle.get(normalized);
    if (targetPage?.kind !== PageKind.Course) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    titles.push(targetPage.title);
  }

  return titles;
}

function courseTitlesFromYearEdges(
  yearPage: ZettelPage,
  edges: readonly GraphEdge[],
  pagesByTitle: ReadonlyMap<string, ZettelPage>,
): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    if (edge.kind !== EdgeKind.PageRef || edge.source !== yearPage.title) {
      continue;
    }
    const normalized = normalizeTitle(edge.target);
    const targetPage = pagesByTitle.get(normalized);
    if (targetPage?.kind !== PageKind.Course) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    titles.push(targetPage.title);
  }

  return titles;
}

/** Courses assigned to a year via frontmatter, body wikilinks, or structural edges. */
export function coursesLinkedToYearPage(
  yearPage: ZettelPage,
  graph: Pick<CurriculumGraph, "pages" | "edges">,
): string[] {
  if (yearPage.kind !== PageKind.Year) {
    return [];
  }

  const pagesByNormalizedTitle = new Map(
    graph.pages.map((page) => [page.normalizedTitle, page]),
  );
  const seen = new Set<string>();
  const titles: string[] = [];

  const addTitle = (ref: string): void => {
    const resolved =
      resolveCoursePageTitle(ref, graph.pages) ??
      (() => {
        const normalized = normalizeTitle(ref);
        const targetPage = pagesByNormalizedTitle.get(normalized);
        return targetPage?.kind === PageKind.Course ? targetPage.title : undefined;
      })();
    if (!resolved) {
      return;
    }
    const normalized = normalizeTitle(resolved);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    titles.push(resolved);
  };

  for (const title of courseTitlesOnYearPage(yearPage)) {
    addTitle(title);
  }
  for (const title of legacyCourseTitlesFromYearRefs(yearPage, pagesByNormalizedTitle)) {
    addTitle(title);
  }
  for (const title of courseTitlesFromYearEdges(yearPage, graph.edges, pagesByNormalizedTitle)) {
    addTitle(title);
  }

  return uniqueSorted(titles).sort((left, right) => left.localeCompare(right, "es-AR"));
}

export function findYearPageForCourse(
  graph: CurriculumGraph,
  degreeTitle: string,
  courseTitle: string,
  degreeSlug?: string,
): ZettelPage | undefined {
  const normalizedCourse = normalizeTitle(courseTitle);
  return yearPagesForDegree(graph.pages, degreeTitle, { degreeSlug }).find((yearPage) =>
    coursesLinkedToYearPage(yearPage, graph).some(
      (title) => normalizeTitle(title) === normalizedCourse,
    ),
  );
}

export function yearLabelForCourseInDegree(
  graph: CurriculumGraph,
  degreeTitle: string,
  courseTitle: string,
  degreeSlug?: string,
): string {
  const yearPage = findYearPageForCourse(graph, degreeTitle, courseTitle, degreeSlug);
  const yearIndex = yearPage ? resolveYearIndex(yearPage) : undefined;
  if (!yearIndex) {
    return "";
  }
  return yearDisplayLabel(yearIndex);
}
