import type { ConceptTag, Diagnostic, PageRef, ZettelPage } from "../types";

export function uuidRefDiagnostic(page: ZettelPage, ref: PageRef): Diagnostic {
  const resolved = ref.resolvedTarget;
  const severity = resolved ? "warning" : "error";
  const code = resolved ? "uuid-ref-resolved" : "uuid-ref-unresolved";
  const message = resolved
    ? `UUID reference in "${page.title}" resolves to "${resolved}".`
    : `UUID reference "${ref.target}" in "${page.title}" could not be resolved.`;

  return {
    severity,
    code,
    message,
    page: page.title,
    line: ref.line,
    details: { target: ref.target, resolvedTarget: ref.resolvedTarget },
  };
}

export function uuidTagDiagnostic(page: ZettelPage, tag: ConceptTag): Diagnostic {
  const resolved = tag.resolvedTarget;
  const severity = resolved ? "warning" : "error";
  const code = resolved ? "uuid-tag-resolved" : "uuid-tag-unresolved";
  const message = resolved
    ? `UUID hashtag in "${page.title}" resolves to "${resolved}".`
    : `UUID hashtag "${tag.target}" in "${page.title}" could not be resolved.`;

  return {
    severity,
    code,
    message,
    page: page.title,
    line: tag.line,
    details: { target: tag.target, resolvedTarget: tag.resolvedTarget },
  };
}
