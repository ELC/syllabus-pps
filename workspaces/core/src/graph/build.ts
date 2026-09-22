import { LoadedConfig } from "../config/loaded-config";
import { deriveExpectedCurriculum } from "../curriculum";
import { coursesLinkedToYearPage, yearPagesForDegree } from "../degree-year";
import { indexResourceCatalog, ResourceCatalogEntry } from "../resources";
import { parsePages, PageSource } from "../parser";
import { CurriculumGraph, ExpectedCurriculum, GraphEdge, PageKind, ZettelPage } from "../types";
import { structuralPageKindRankByKind } from "./structural-kind-rank";

export function canonicalStructuralEdgeDirection(
  source: string,
  target: string,
  pageKindByTitle: ReadonlyMap<string, PageKind>,
): { source: string; target: string } {
  const sourceKind = pageKindByTitle.get(source);
  const targetKind = pageKindByTitle.get(target);
  if (!sourceKind || !targetKind) {
    return { source, target };
  }

  const sourceRank = structuralPageKindRankByKind[sourceKind];
  const targetRank = structuralPageKindRankByKind[targetKind];
  if (sourceRank === undefined || targetRank === undefined || sourceRank <= targetRank) {
    return { source, target };
  }

  return { source: target, target: source };
}

export function buildGraphFromPages(input: {
  sources: PageSource[];
  config: LoadedConfig;
  generatedAt?: string;
  resources?: ResourceCatalogEntry[];
}): CurriculumGraph {
  const resources = input.resources ?? [];
  const catalog = indexResourceCatalog(resources);
  const pages = parsePages(
    input.sources,
    {
      expectedCourseTitles: input.config.expectedCourseTitles,
      expectedYearTitles: input.config.expectedYearTitles,
      administrativeTitles: input.config.administrativeTitles,
    },
    catalog,
  );

  const derivedYears = deriveExpectedCurriculum(pages).years;
  const expected: ExpectedCurriculum = {
    ...input.config.expected,
    years: derivedYears,
  };

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    pages,
    edges: buildEdges(pages),
    expected,
    resources,
  };
}

export function buildEdges(pages: ZettelPage[]): GraphEdge[] {
  const pageKindByTitle = new Map(pages.map((page) => [page.title, page.kind]));

  const titleSet = new Set(pages.map((page) => page.title));

  const edges = pages.flatMap((page) => [
    ...(page.kind === "course" ? (page.correlativas ?? []) : []).flatMap((correlativa) => {
      const prerequisite = correlativa.resolvedTarget ?? correlativa.target;
      if (!titleSet.has(prerequisite)) {
        return [];
      }

      return [
        {
          source: prerequisite,
          target: page.title,
          kind: "course-prerequisite" as const,
          rawTarget: correlativa.target,
          line: 0,
        },
      ];
    }),
    ...(page.kind === "concept" ? (page.dependsOn ?? []) : []).flatMap((dep) => {
      const prerequisite = dep.resolvedTarget ?? dep.target;
      if (!titleSet.has(prerequisite)) {
        return [];
      }

      return [
        {
          source: prerequisite,
          target: page.title,
          kind: "concept-dependency" as const,
          rawTarget: dep.target,
          line: 0,
        },
      ];
    }),
    ...page.refs.map((ref) => {
      const target = ref.resolvedTarget ?? ref.target;
      const direction = canonicalStructuralEdgeDirection(page.title, target, pageKindByTitle);

      return {
        source: direction.source,
        target: direction.target,
        kind: "page-ref" as const,
        rawTarget: ref.target,
        line: ref.line,
      };
    }),
    ...page.tags.map((tag) => ({
      source: page.title,
      target: tag.resolvedTarget ?? tag.target,
      kind: "concept-tag" as const,
      rawTarget: tag.target,
      line: tag.line,
    })),
  ]);

  const preliminaryGraph = { pages, edges };
  for (const page of pages) {
    if (page.kind !== "year") {
      continue;
    }
    for (const courseTitle of coursesLinkedToYearPage(page, preliminaryGraph)) {
      if (!titleSet.has(courseTitle)) {
        continue;
      }
      const direction = canonicalStructuralEdgeDirection(
        page.title,
        courseTitle,
        pageKindByTitle,
      );
      edges.push({
        source: direction.source,
        target: direction.target,
        kind: "page-ref",
        rawTarget: courseTitle,
        line: 0,
      });
    }
  }

  for (const degreePage of pages) {
    if (degreePage.kind !== "degree") {
      continue;
    }
    for (const yearPage of yearPagesForDegree(pages, degreePage.title, {
      degreeSlug: degreePage.slug,
    })) {
      const direction = canonicalStructuralEdgeDirection(
        degreePage.title,
        yearPage.title,
        pageKindByTitle,
      );
      edges.push({
        source: direction.source,
        target: direction.target,
        kind: "page-ref",
        rawTarget: yearPage.title,
        line: 0,
      });
    }
  }

  return edges.sort((left, right) => {
    const bySource = left.source.localeCompare(right.source, "es-AR");
    if (bySource !== 0) {
      return bySource;
    }

    const byTarget = left.target.localeCompare(right.target, "es-AR");
    if (byTarget !== 0) {
      return byTarget;
    }

    const byKind = left.kind.localeCompare(right.kind, "es-AR");
    if (byKind !== 0) {
      return byKind;
    }

    return left.line - right.line;
  });
}
