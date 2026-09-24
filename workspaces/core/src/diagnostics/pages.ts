import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, PageKind, type ZettelPage } from "../types";

import {
  administrativePageDiagnostic,
  emptyPageDiagnostic,
  nonBulletContentDiagnostic,
  orphanPageDiagnostic,
  selfLinkDiagnostic,
} from "./pages-errors";

function isStructurallyNonEmptyPage(page: ZettelPage): boolean {
  if (page.blocks.length > 0) {
    return true;
  }
  if (page.kind === PageKind.Year && (page.courses?.length ?? 0) > 0) {
    return true;
  }
  if (page.kind === PageKind.Degree && page.yearsCount !== undefined) {
    return true;
  }
  return false;
}

export function emptyPages(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (isStructurallyNonEmptyPage(page)) {
      continue;
    }
    const diagnostic = emptyPageDiagnostic(page);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function selfLinkDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    for (const ref of page.refs) {
      const refTarget = ref.resolvedTarget ?? ref.target;
      const normalizedRef = normalizeTitle(refTarget);
      if (normalizedRef !== page.normalizedTitle) {
        continue;
      }
      const diagnostic = selfLinkDiagnostic(page, ref);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}

export function orphanDiagnostics(
  graph: CurriculumGraph,
  incomingCounts: Map<string, number>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind === PageKind.Degree) {
      continue;
    }
    const incoming = incomingCounts.get(page.title) ?? 0;
    if (incoming !== 0) {
      continue;
    }
    const diagnostic = orphanPageDiagnostic(page);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function administrativeDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Administrative) {
      continue;
    }
    const diagnostic = administrativePageDiagnostic(page);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function nonBulletContentDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    const lines = page.nonBulletLines ?? [];
    for (const line of lines) {
      const diagnostic = nonBulletContentDiagnostic(page, line);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}
