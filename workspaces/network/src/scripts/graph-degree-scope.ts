import {
  PageKind,
  courseTitlesNoEstructuradoOnYearPage,
  courseTitlesOnYearPage,
  parseYearSlug,
  resolveYearIndex,
  yearPagesForDegree,
  type ZettelPage,
} from "@pps/core";
import { borderColorForYearIndex } from "@pps/shell/austral-tokens";
import type cytoscape from "cytoscape";

export interface DegreeDropdownOption {
  value: string;
  label: string;
}

export function buildDegreeDropdownOptionsFromEntries(
  degrees: readonly { slug: string; title: string }[],
): DegreeDropdownOption[] {
  return [
    { value: "", label: "Todas" },
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
    { value: "", label: "Todas" },
    ...degrees.map((degree) => ({ value: degree.slug, label: degree.title })),
  ];
}

export { borderColorForYearIndex } from "@pps/shell/austral-tokens";

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

function addScopedHierarchyNodeIds(
  cy: cytoscape.Core,
  pages: readonly ZettelPage[],
  degreeSlug: string,
  visible: Set<string>,
): void {
  const normalizedDegree = degreeSlug.trim();
  const degreePage = pages.find(
    (page) => page.kind === PageKind.Degree && page.slug === normalizedDegree,
  );
  const degreeTitle = degreePage?.title.trim();
  if (!degreeTitle) {
    return;
  }

  cy.nodes().forEach((node) => {
    if (!node.isNode()) {
      return;
    }
    const kind = String(node.data("kind"));
    const slug = node.data("slug");
    if (typeof slug !== "string" || !slug) {
      return;
    }
    if (kind === "degree" && slug === normalizedDegree) {
      visible.add(node.id());
    }
  });

  for (const yearPage of yearPagesForDegree(pages, degreeTitle, { degreeSlug: normalizedDegree })) {
    const yearSlug = yearPage.slug.trim();
    if (!yearSlug) {
      continue;
    }
    cy.nodes().forEach((node) => {
      if (!node.isNode()) {
        return;
      }
      if (String(node.data("kind")) === "year" && node.data("slug") === yearSlug) {
        visible.add(node.id());
      }
    });
  }
}

export function nodeIdsInDegreeScope(
  cy: cytoscape.Core,
  degreeSlug: string,
  pages: readonly ZettelPage[],
  conceptsByCourseSlug: Map<string, Set<string>>,
  options: { includeConcepts?: boolean; includeHierarchy?: boolean } = {},
): Set<string> {
  const includeConcepts = options.includeConcepts ?? false;
  const includeHierarchy = options.includeHierarchy ?? true;
  const courseMeta = courseMetaForDegree(pages, degreeSlug);
  const visible = new Set<string>();

  if (includeHierarchy) {
    addScopedHierarchyNodeIds(cy, pages, degreeSlug, visible);
  }

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
