import { CurriculumGraph, Diagnostic } from "../types";

export function uuidReferenceDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages.flatMap((page) => [
    ...page.refs
      .filter((ref) => ref.isUuid)
      .map((ref): Diagnostic => ({
        severity: ref.resolvedTarget ? "warning" : "error",
        code: ref.resolvedTarget ? "uuid-ref-resolved" : "uuid-ref-unresolved",
        message: ref.resolvedTarget
          ? `UUID reference in "${page.title}" resolves to "${ref.resolvedTarget}".`
          : `UUID reference "${ref.target}" in "${page.title}" could not be resolved.`,
        page: page.title,
        line: ref.line,
        details: { target: ref.target, resolvedTarget: ref.resolvedTarget },
      })),
    ...page.tags
      .filter((tag) => tag.isUuid)
      .map((tag): Diagnostic => ({
        severity: tag.resolvedTarget ? "warning" : "error",
        code: tag.resolvedTarget ? "uuid-tag-resolved" : "uuid-tag-unresolved",
        message: tag.resolvedTarget
          ? `UUID hashtag in "${page.title}" resolves to "${tag.resolvedTarget}".`
          : `UUID hashtag "${tag.target}" in "${page.title}" could not be resolved.`,
        page: page.title,
        line: tag.line,
        details: { target: tag.target, resolvedTarget: tag.resolvedTarget },
      })),
  ]);
}
