import type { ResourceCatalogEntry } from "../resources/types";
import type { ResourceValidationIssue } from "../resources/validate";
import type { CitationRef, Diagnostic, ZettelBlock, ZettelPage } from "../types";

export function resourceCatalogInvalidDiagnostic(issue: ResourceValidationIssue): Diagnostic {
  const resourceId = issue.id ?? "";
  return {
    severity: "error",
    code: "resource-catalog-invalid",
    message: issue.message,
    page: resourceId,
    details: { field: issue.field },
  };
}

export function resourceCatalogUnusedDiagnostic(entry: ResourceCatalogEntry): Diagnostic {
  return {
    severity: "warning",
    code: "resource-catalog-unused",
    message: `Resource catalog entry "${entry.id}" is not cited by any concept note.`,
    page: entry.id,
  };
}

export function citationUnresolvedDiagnostic(
  page: ZettelPage,
  block: ZettelBlock,
  citation: CitationRef,
): Diagnostic {
  return {
    severity: "error",
    code: "citation-unresolved",
    message: `Page "${page.title}" cites resource "${citation.id}" that is missing from the resource catalog.`,
    page: page.title,
    line: block.line,
    details: { citationId: citation.id, text: block.text },
  };
}
