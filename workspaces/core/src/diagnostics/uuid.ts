import { CurriculumGraph, Diagnostic } from "../types";

import { uuidRefDiagnostic, uuidTagDiagnostic } from "./uuid-errors";

export function uuidReferenceDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    for (const ref of page.refs) {
      if (!ref.isUuid) {
        continue;
      }
      const diagnostic = uuidRefDiagnostic(page, ref);
      diagnostics.push(diagnostic);
    }

    for (const tag of page.tags) {
      if (!tag.isUuid) {
        continue;
      }
      const diagnostic = uuidTagDiagnostic(page, tag);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}
