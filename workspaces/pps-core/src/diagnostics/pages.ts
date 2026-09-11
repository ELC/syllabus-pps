import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic } from "../types";

export function emptyPages(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages
    .filter((page) => page.blocks.length === 0)
    .map((page) => ({
      severity: page.kind === "course" || page.kind === "year" ? "error" : "warning",
      code: "empty-page",
      message: `Page "${page.title}" has no note blocks.`,
      page: page.title,
      details: { kind: page.kind },
    }));
}

export function selfLinkDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages.flatMap((page) =>
    page.refs
      .filter((ref) => normalizeTitle(ref.resolvedTarget ?? ref.target) === page.normalizedTitle)
      .map((ref) => ({
        severity: "warning" as const,
        code: "self-link",
        message: `Page "${page.title}" links to itself.`,
        page: page.title,
        line: ref.line,
        details: { target: ref.resolvedTarget ?? ref.target },
      })),
  );
}

export function orphanDiagnostics(
  graph: CurriculumGraph,
  incomingCounts: Map<string, number>,
): Diagnostic[] {
  return graph.pages
    .filter((page) => page.kind !== "career")
    .filter((page) => (incomingCounts.get(page.title) ?? 0) === 0)
    .map((page) => ({
      severity: page.kind === "course" || page.kind === "year" ? "error" : "warning",
      code: page.kind === "concept" ? "orphan-concept" : "orphan-page",
      message: `Page "${page.title}" has no incoming references.`,
      page: page.title,
      details: { kind: page.kind },
    }));
}

export function administrativeDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages
    .filter((page) => page.kind === "administrative")
    .map((page) => ({
      severity: "error",
      code: "administrative-page",
      message: `Administrative page "${page.title}" leaked into the content graph.`,
      page: page.title,
    }));
}

export function nonBulletContentDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages.flatMap((page) =>
    (page.nonBulletLines ?? []).map((line) => ({
      severity: "warning" as const,
      code: "non-bullet-content" as const,
      message: `Line ${line} is not a bullet block; only "- " outline lines are parsed.`,
      page: page.title,
      line,
    })),
  );
}
