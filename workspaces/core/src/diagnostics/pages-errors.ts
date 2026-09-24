import { PageKind, type Diagnostic, type PageRef, type ZettelPage } from "../types";

export function emptyPageDiagnostic(page: ZettelPage): Diagnostic {
  const severity = emptyPageSeverity(page);
  return {
    severity,
    code: "empty-page",
    message: `Page "${page.title}" has no note blocks.`,
    page: page.title,
    details: { kind: page.kind },
  };
}

export function selfLinkDiagnostic(page: ZettelPage, ref: PageRef): Diagnostic {
  const target = ref.resolvedTarget ?? ref.target;
  return {
    severity: "warning",
    code: "self-link",
    message: `Page "${page.title}" links to itself.`,
    page: page.title,
    line: ref.line,
    details: { target },
  };
}

export function orphanPageDiagnostic(page: ZettelPage): Diagnostic {
  const severity = orphanPageSeverity(page);
  const code = orphanDiagnosticCode(page);
  return {
    severity,
    code,
    message: `Page "${page.title}" has no incoming references.`,
    page: page.title,
    details: { kind: page.kind },
  };
}

export function administrativePageDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "administrative-page",
    message: `Administrative page "${page.title}" leaked into the content graph.`,
    page: page.title,
  };
}

export function nonBulletContentDiagnostic(page: ZettelPage, line: number): Diagnostic {
  return {
    severity: "warning",
    code: "non-bullet-content",
    message: `Line ${line} is not a bullet block; only "- " outline lines are parsed.`,
    page: page.title,
    line,
  };
}

function emptyPageSeverity(page: ZettelPage): Diagnostic["severity"] {
  if (page.kind === PageKind.Course || page.kind === PageKind.Year) {
    return "error";
  }
  return "warning";
}

function orphanPageSeverity(page: ZettelPage): Diagnostic["severity"] {
  if (page.kind === PageKind.Course || page.kind === PageKind.Year) {
    return "error";
  }
  return "warning";
}

function orphanDiagnosticCode(page: ZettelPage): "orphan-concept" | "orphan-page" {
  if (page.kind === PageKind.Concept) {
    return "orphan-concept";
  }
  return "orphan-page";
}
