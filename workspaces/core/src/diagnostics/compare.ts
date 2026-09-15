import { Diagnostic, diagnosticSeverities, DiagnosticSeverity } from "../types";

const severityRank = Object.fromEntries(
  diagnosticSeverities.map((severity, index) => [severity, index]),
) as Record<DiagnosticSeverity, number>;

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  const bySeverity = severityRank[a.severity] - severityRank[b.severity];
  if (bySeverity !== 0) {
    return bySeverity;
  }

  const byCode = a.code.localeCompare(b.code, "es-AR");
  if (byCode !== 0) {
    return byCode;
  }

  return (a.page ?? "").localeCompare(b.page ?? "", "es-AR");
}
