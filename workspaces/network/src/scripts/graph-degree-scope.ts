import {
  PageKind,
  courseTitlesNoEstructuradoOnYearPage,
  courseTitlesOnYearPage,
  parseYearSlug,
  resolveYearIndex,
  yearPagesForDegree,
  type ZettelPage,
} from "@pps/core";
import { kindStyleForKind } from "@pps/shell/austral-tokens";
import type cytoscape from "cytoscape";

export interface DegreeDropdownOption {
  value: string;
  label: string;
}

export function buildDegreeDropdownOptionsFromEntries(
  degrees: readonly { slug: string; title: string }[],
): DegreeDropdownOption[] {
  return [
    { value: "", label: "Todas las carreras" },
    ...[...degrees]
      .sort((left, right) => left.title.localeCompare(right.title, "es-AR"))
      .map((degree) => ({ value: degree.slug, label: degree.title })),
  ];
}

export function buildDegreeDropdownOptions(pages: readonly ZettelPage[]): DegreeDropdownOption[] {
  const degrees = pages
    .filter((page) => page.kind === PageKind.Degree)
    .map((page) => ({ slug: page.slug, title: page.title.trim() || page.slug }))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));

  return [
    { value: "", label: "Todas las carreras" },
    ...degrees.map((degree) => ({ value: degree.slug, label: degree.title })),
  ];
}

/** Distinct course border hues by año index within a degree (Okabe–Ito–aligned). */
const YEAR_COURSE_BASES = [
  "#D97706", // año 1 — amber (default materia)
  "#2E3092", // año 2 — navy
  "#9D4470", // año 3 — magenta
  "#56B4E9", // año 4 — sky blue (avoid warm tan too close to año 1)
  "#0072B2", // año 5 — blue
  "#CC79A7", // año 6 — pink
  "#009E73", // año 7 — green
  "#F0E442", // año 8 — yellow
] as const;

export function borderColorForYearIndex(yearIndex: number): string {
  const index = Math.max(1, yearIndex) - 1;
  return YEAR_COURSE_BASES[index % YEAR_COURSE_BASES.length] ?? kindStyleForKind("course").border;
}

export interface CourseDegreeScopeMeta {
  yearIndex: number;
  borderColor: string;
  tne: boolean;
}

function courseSlugForTitle(pages: readonly ZettelPage[], courseTitle: string): string | undefined {
  const normalized = courseTitle.trim();
  if (!normalized) {
    return undefined;
  }

  const page = pages.find(
    (entry) => entry.kind === PageKind.Course && entry.title.trim() === normalized,
  );
  return page?.slug;
}

function addCourseTitleToMeta(
  pages: readonly ZettelPage[],
  metaBySlug: Map<string, CourseDegreeScopeMeta>,
  courseTitle: string,
  yearIndex: number,
  tne: boolean,
): void {
  const slug = courseSlugForTitle(pages, courseTitle);
  if (!slug) {
    return;
  }

  const borderColor = borderColorForYearIndex(yearIndex);
  metaBySlug.set(slug, { yearIndex, borderColor, tne });
}

export function courseMetaForDegree(
  pages: readonly ZettelPage[],
  degreeSlug: string,
): Map<string, CourseDegreeScopeMeta> {
  const normalizedDegree = degreeSlug.trim();
  if (!normalizedDegree) {
    return new Map();
  }

  const degreePage = pages.find(
    (page) => page.kind === PageKind.Degree && page.slug === normalizedDegree,
  );
  const degreeTitle = degreePage?.title.trim();
  if (!degreeTitle) {
    return new Map();
  }

  const metaBySlug = new Map<string, CourseDegreeScopeMeta>();

  for (const yearPage of yearPagesForDegree(pages, degreeTitle, { degreeSlug: normalizedDegree })) {
    const yearIndex = resolveYearIndex(yearPage) ?? parseYearSlug(yearPage.slug)?.yearIndex ?? 1;

    for (const title of courseTitlesOnYearPage(yearPage)) {
      addCourseTitleToMeta(pages, metaBySlug, title, yearIndex, false);
    }

    for (const title of courseTitlesNoEstructuradoOnYearPage(yearPage)) {
      addCourseTitleToMeta(pages, metaBySlug, title, yearIndex, true);
    }
  }

  return metaBySlug;
}

export function buildConceptNodeIdsByCourseSlug(cy: cytoscape.Core): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  cy.edges().forEach((edge) => {
    if (String(edge.data("kind")) !== "page-ref") {
      return;
    }

    const source = edge.source();
    const target = edge.target();
    if (!source.isNode() || !target.isNode()) {
      return;
    }

    if (String(source.data("kind")) !== "course" || String(target.data("kind")) !== "concept") {
      return;
    }

    const slug = source.data("slug");
    if (typeof slug !== "string" || !slug) {
      return;
    }

    const conceptIds = map.get(slug) ?? new Set<string>();
    conceptIds.add(target.id());
    map.set(slug, conceptIds);
  });

  return map;
}

function addConceptNeighborsForCourse(
  courseNode: cytoscape.NodeSingular,
  visible: Set<string>,
): void {
  courseNode.connectedEdges().forEach((edge) => {
    const source = edge.source();
    const target = edge.target();
    const neighbor = source.id() === courseNode.id() ? target : source;
    if (neighbor.isNode() && String(neighbor.data("kind")) === "concept") {
      visible.add(neighbor.id());
    }
  });
}

export function nodeIdsInDegreeScope(
  cy: cytoscape.Core,
  degreeSlug: string,
  pages: readonly ZettelPage[],
  conceptsByCourseSlug: Map<string, Set<string>>,
  options: { includeConcepts?: boolean } = {},
): Set<string> {
  const includeConcepts = options.includeConcepts ?? false;
  const courseMeta = courseMetaForDegree(pages, degreeSlug);
  const visible = new Set<string>();

  for (const courseSlug of courseMeta.keys()) {
    const courseNode = cy.nodes().filter((node) => {
      return node.isNode() && String(node.data("kind")) === "course" && node.data("slug") === courseSlug;
    });
    if (courseNode.empty() || !courseNode[0]?.isNode()) {
      continue;
    }

    const course = courseNode[0];
    visible.add(course.id());

    if (!includeConcepts) {
      continue;
    }

    for (const conceptId of conceptsByCourseSlug.get(courseSlug) ?? []) {
      visible.add(conceptId);
    }

    addConceptNeighborsForCourse(course, visible);
  }

  return visible;
}
