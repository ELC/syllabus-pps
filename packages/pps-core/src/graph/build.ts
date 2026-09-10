import { LoadedConfig } from "../config/loaded-config";
import { parsePages, PageSource } from "../parser";
import { CurriculumGraph, GraphEdge, ZettelPage } from "../types";

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
  const edges = pages.flatMap((page) => [
    ...page.refs.map((ref) => ({
      source: page.title,
      target: ref.resolvedTarget ?? ref.target,
      kind: "page-ref" as const,
      rawTarget: ref.target,
      line: ref.line,
    })),
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
