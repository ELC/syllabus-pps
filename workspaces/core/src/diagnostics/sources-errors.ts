import { MINIMUM_CONCEPT_SOURCES } from "../analysis";
import type { Diagnostic, ZettelBlock, ZettelPage } from "../types";

export function conceptMissingBookSourceDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "warning",
    code: "concept-missing-book-source",
    message: `Concept page "${page.title}" has no book source link.`,
    page: page.title,
  };
}

export function conceptInsufficientSourcesDiagnostic(
  page: ZettelPage,
  sources: readonly string[],
): Diagnostic {
  const minimumSources = MINIMUM_CONCEPT_SOURCES;
  const sourceCount = sources.length;
  return {
    severity: "warning",
    code: "concept-insufficient-sources",
    message: `Concept page "${page.title}" has ${sourceCount} source link(s); target is at least ${minimumSources}.`,
    page: page.title,
    details: { sourceCount, minimumSources, sources: [...sources] },
  };
}

export function conceptNoteWithoutSourceLinkDiagnostic(
  page: ZettelPage,
  block: ZettelBlock,
): Diagnostic {
  return {
    severity: "warning",
    code: "concept-note-without-source-link",
    message: `Concept page "${page.title}" has a note without a source link.`,
    page: page.title,
    line: block.line,
    details: { text: block.text },
  };
}
