import { hasErrorDiagnostics, type Diagnostic } from "@pps/core";

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return hasErrorDiagnostics(diagnostics);
}
