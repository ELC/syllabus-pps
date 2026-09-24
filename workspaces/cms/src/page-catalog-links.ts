import {
  buildGraphFromPages,
  emptyLoadedConfig,
  normalizeTitle,
  PageKind,
  parseYearSlug,
  yearDisplayLabel,
  type CurriculumGraph,
  type PageSource,
  type ResourceCatalogEntry,
} from "@pps/core";

import { normalizeYearCourseSlugs, type CoursePageOption } from "./course-pages";
import { splitPageDocument } from "./page-document";

export interface CatalogYearPageLink {
  slug: string;
  label: string;
  listed: boolean;
  title: string;
}

export interface CatalogCourseLink {
  slug: string;
  title: string;
}

export interface CatalogConceptLink {
  slug: string;
  title: string;
}

function buildDegreeShortNameBySlug(
  allSources: ReadonlyArray<{ path: string; content: string }>,
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const page of allSources) {
    const fileSlug = page.path.replace(/\.md$/i, "");
    const { metadata } = splitPageDocument(page.content, fileSlug);
    if (metadata.kind !== PageKind.Degree) {
      continue;
    }
    const degreeSlug = metadata.slug.trim() || fileSlug;
    const shortName = metadata.title.trim() || degreeSlug;
    map.set(degreeSlug, shortName);
  }
  return map;
}

function degreeShortNameForYearPage(
  pageSlug: string,
  yearMetadata: { degree?: string },
  degreeShortBySlug: ReadonlyMap<string, string>,
): string {
  const parsed = parseYearSlug(pageSlug);
  if (parsed?.degreeSlug) {
    return degreeShortBySlug.get(parsed.degreeSlug) ?? parsed.degreeSlug;
  }
  const degreeKey = yearMetadata.degree?.trim();
  return degreeKey ?? "";
}

function yearGridIncludesCourseSlug(
  yearCourses: readonly string[],
  courseSlug: string,
  courseTitle: string,
  coursePages: readonly CoursePageOption[],
): boolean {
  const slug = courseSlug.trim();
  if (!slug) {
    return false;
  }

  const normalizedSlugs = normalizeYearCourseSlugs([...yearCourses], [...coursePages]);
  if (normalizedSlugs.includes(slug)) {
    return true;
  }

  const titleKey = normalizeTitle(courseTitle);
  for (const entry of yearCourses) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed === slug || normalizeTitle(trimmed) === titleKey) {
      return true;
    }
  }

  return false;
}

/** Year pages whose course grid lists the given course (any trayecto). */
export function yearPagesForCourseInSources(
  allSources: ReadonlyArray<{ path: string; content: string }>,
  courseSlug: string,
  courseTitle: string,
  coursePages: readonly CoursePageOption[],
  listedPageSlugs: ReadonlySet<string>,
  pageTitlesBySlug: ReadonlyMap<string, string>,
): CatalogYearPageLink[] {
  const normalizedCourse = courseSlug.trim();
  if (!normalizedCourse) {
    return [];
  }

  const entries: CatalogYearPageLink[] = [];
  const degreeShortBySlug = buildDegreeShortNameBySlug(allSources);

  for (const page of allSources) {
    const fileSlug = page.path.replace(/\.md$/i, "");
    const { metadata } = splitPageDocument(page.content, fileSlug);
    if (metadata.kind !== PageKind.Year) {
      continue;
    }

    if (
      !yearGridIncludesCourseSlug(metadata.courses, normalizedCourse, courseTitle, coursePages) &&
      !yearGridIncludesCourseSlug(
        metadata.coursesNoEstructurado,
        normalizedCourse,
        courseTitle,
        coursePages,
      )
    ) {
      continue;
    }

    const pageSlug = metadata.slug.trim() || fileSlug;
    const yearIndex =
      metadata.yearIndex ?? parseYearSlug(pageSlug)?.yearIndex ?? resolveYearIndexFromMeta(pageSlug, metadata);
    const displayTitle =
      pageTitlesBySlug.get(pageSlug) ?? (metadata.title.trim() || pageSlug);
    const degreeShort = degreeShortNameForYearPage(pageSlug, metadata, degreeShortBySlug);
    const yearLabel = yearIndex ? yearDisplayLabel(yearIndex) : displayTitle;
    const buttonLabel =
      degreeShort && yearIndex ? `${degreeShort} · ${yearLabel}` : yearLabel;

    entries.push({
      slug: pageSlug,
      label: buttonLabel,
      listed: listedPageSlugs.has(pageSlug),
      title: `Abrir ${displayTitle} en el editor`,
    });
  }

  return entries.sort((left, right) => {
    const titleCompare = left.title.localeCompare(right.title, "es-AR");
    if (titleCompare !== 0) {
      return titleCompare;
    }
    return left.slug.localeCompare(right.slug, "es-AR");
  });
}

function resolveYearIndexFromMeta(
  pageSlug: string,
  metadata: { yearIndex?: number },
): number | undefined {
  if (metadata.yearIndex !== undefined && metadata.yearIndex > 0) {
    return metadata.yearIndex;
  }
  return parseYearSlug(pageSlug)?.yearIndex ?? undefined;
}

export function buildEditorCatalogGraph(
  allSources: PageSource[],
  resources: ResourceCatalogEntry[],
): CurriculumGraph {
  const config = emptyLoadedConfig();
  return buildGraphFromPages({
    sources: allSources,
    config,
    generatedAt: new Date().toISOString(),
    resources,
  });
}

/** Course pages that link to the concept via hashtags or wikilinks. */
export function coursesForConceptInGraph(
  graph: CurriculumGraph,
  conceptSlug: string,
  conceptTitle: string,
): CatalogCourseLink[] {
  const normalizedTitle = normalizeTitle(conceptTitle);
  const normalizedSlug = normalizeTitle(conceptSlug.trim());
  if (!normalizedTitle && !normalizedSlug) {
    return [];
  }

  const links: CatalogCourseLink[] = [];
  const seen = new Set<string>();

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Course) {
      continue;
    }

    let linksConcept = false;
    for (const tag of page.tags) {
      const target = normalizeTitle(tag.resolvedTarget ?? tag.target);
      if (target === normalizedTitle || (normalizedSlug && target === normalizedSlug)) {
        linksConcept = true;
        break;
      }
    }

    if (!linksConcept) {
      for (const ref of page.refs) {
        const target = normalizeTitle(ref.resolvedTarget ?? ref.target);
        if (target === normalizedTitle || (normalizedSlug && target === normalizedSlug)) {
          linksConcept = true;
          break;
        }
      }
    }

    if (!linksConcept || seen.has(page.slug)) {
      continue;
    }
    seen.add(page.slug);
    links.push({ slug: page.slug, title: page.title });
  }

  return links.sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

function findCoursePageInGraph(
  graph: CurriculumGraph,
  courseSlug: string,
  courseTitle: string,
): CurriculumGraph["pages"][number] | undefined {
  const trimmedSlug = courseSlug.trim();
  const normalizedCourseTitle = normalizeTitle(courseTitle);
  const normalizedCourseSlug = normalizeTitle(trimmedSlug);

  return graph.pages.find(
    (page) =>
      page.kind === PageKind.Course &&
      (page.slug === trimmedSlug ||
        normalizeTitle(page.slug) === normalizedCourseSlug ||
        page.normalizedTitle === normalizedCourseTitle),
  );
}

/** Concept pages linked from a course via hashtags or wikilinks. */
export function conceptsForCourseInGraph(
  graph: CurriculumGraph,
  courseSlug: string,
  courseTitle: string,
): CatalogConceptLink[] {
  const coursePage = findCoursePageInGraph(graph, courseSlug, courseTitle);
  if (!coursePage) {
    return [];
  }

  const conceptsByNormalizedTitle = new Map(
    graph.pages
      .filter((page) => page.kind === PageKind.Concept)
      .map((page) => [page.normalizedTitle, page] as const),
  );
  const conceptsByNormalizedSlug = new Map(
    graph.pages
      .filter((page) => page.kind === PageKind.Concept)
      .map((page) => [normalizeTitle(page.slug), page] as const),
  );

  const links: CatalogConceptLink[] = [];
  const seen = new Set<string>();

  const addConceptTarget = (target: string): void => {
    const normalized = normalizeTitle(target);
    const conceptPage =
      conceptsByNormalizedTitle.get(normalized) ?? conceptsByNormalizedSlug.get(normalized);
    if (!conceptPage || seen.has(conceptPage.slug)) {
      return;
    }
    seen.add(conceptPage.slug);
    links.push({ slug: conceptPage.slug, title: conceptPage.title });
  };

  for (const tag of coursePage.tags) {
    addConceptTarget(tag.resolvedTarget ?? tag.target);
  }

  for (const ref of coursePage.refs) {
    const target = ref.resolvedTarget ?? ref.target;
    const normalized = normalizeTitle(target);
    if (conceptsByNormalizedTitle.has(normalized) || conceptsByNormalizedSlug.has(normalized)) {
      addConceptTarget(target);
    }
  }

  return links.sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}
