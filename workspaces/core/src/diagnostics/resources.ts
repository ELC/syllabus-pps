import { collectUsedCitationIds } from "../analysis";
import { collectResourceCatalogIssues } from "../resources";
import { CurriculumGraph, Diagnostic } from "../types";

export function resourceCatalogDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const issues = collectResourceCatalogIssues(graph.resources);

  for (const issue of issues) {
    diagnostics.push({
      severity: "error",
      code: "resource-catalog-invalid",
      message: issue.message,
      page: issue.id,
      details: { field: issue.field },
    });
  }

  const usedIds = collectUsedCitationIds(graph.pages);
  for (const entry of graph.resources) {
    if (!usedIds.has(entry.id)) {
      diagnostics.push({
        severity: "warning",
        code: "resource-catalog-unused",
        message: `Resource catalog entry "${entry.id}" is not cited by any concept note.`,
        page: entry.id,
      });
    }
  }

  return diagnostics;
}

export function unresolvedCitationDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages.flatMap((page) =>
    page.blocks.flatMap((block) =>
      block.citations
        .filter((citation) => citation.resolved === undefined)
        .map((citation) => ({
          severity: "error" as const,
          code: "citation-unresolved" as const,
          message: `Page "${page.title}" cites resource "${citation.id}" that is missing from content/resources.json.`,
          page: page.title,
          line: block.line,
          details: { citationId: citation.id, text: block.text },
        })),
    ),
  );
}
