import { Diagnostic, DiagnosticSeverity } from "../types";

export const blockingDiagnosticSeverities = ["error"] as const satisfies readonly DiagnosticSeverity[];

export function countDiagnosticsBySeverity(
  diagnostics: readonly Diagnostic[],
  severity: DiagnosticSeverity,
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
}

export function hasDiagnosticsWithSeverity(
  diagnostics: readonly Diagnostic[],
  severity: DiagnosticSeverity,
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === severity);
}

export function hasBlockingDiagnostics(diagnostics: readonly Diagnostic[]): boolean {
  return hasErrorDiagnostics(diagnostics);
}

export function hasErrorDiagnostics(diagnostics: readonly Diagnostic[]): boolean {
  return hasDiagnosticsWithSeverity(diagnostics, "error");
}
