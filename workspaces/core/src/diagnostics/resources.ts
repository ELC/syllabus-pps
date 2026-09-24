import { collectUsedCitationIds } from "../analysis";
import { collectResourceCatalogIssues } from "../resources";
import { CurriculumGraph, Diagnostic } from "../types";

import {
  citationUnresolvedDiagnostic,
  resourceCatalogInvalidDiagnostic,
  resourceCatalogUnusedDiagnostic,
} from "./resources-errors";

export function resourceCatalogDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const issues = collectResourceCatalogIssues(graph.resources);

  for (const issue of issues) {
    const diagnostic = resourceCatalogInvalidDiagnostic(issue);
    diagnostics.push(diagnostic);
  }

  const usedIds = collectUsedCitationIds(graph.pages);
  for (const entry of graph.resources) {
    if (usedIds.has(entry.id)) {
      continue;
    }
    const diagnostic = resourceCatalogUnusedDiagnostic(entry);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function unresolvedCitationDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    for (const block of page.blocks) {
      for (const citation of block.citations) {
        if (citation.resolved !== undefined) {
          continue;
        }
        const diagnostic = citationUnresolvedDiagnostic(page, block, citation);
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
}
