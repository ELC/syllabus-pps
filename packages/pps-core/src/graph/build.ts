import { LoadedConfig } from "../config/loaded-config";
import { parsePages, PageSource } from "../parser";
import { CurriculumGraph, GraphEdge, PageKind, ZettelPage } from "../types";

const STRUCTURAL_KIND_RANK: Partial<Record<PageKind, number>> = {
  career: 0,
  year: 1,
  course: 2,
};

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

  const sourceRank = STRUCTURAL_KIND_RANK[sourceKind];
  const targetRank = STRUCTURAL_KIND_RANK[targetKind];
  if (sourceRank === undefined || targetRank === undefined || sourceRank <= targetRank) {
    return { source, target };
  }

  return { source: target, target: source };
}

export function buildGraphFromPages(input: {
  sources: PageSource[];
  config: LoadedConfig;
  generatedAt?: string;
}): CurriculumGraph {
  const pages = parsePages(input.sources, {
    expectedCourseTitles: input.config.expectedCourseTitles,
    expectedYearTitles: input.config.expectedYearTitles,
    administrativeTitles: input.config.administrativeTitles,
  });

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    pages,
    edges: buildEdges(pages),
    expected: input.config.expected,
  };
}

export function buildEdges(pages: ZettelPage[]): GraphEdge[] {
  const pageKindByTitle = new Map(pages.map((page) => [page.title, page.kind]));

  const edges = pages.flatMap((page) => [
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
