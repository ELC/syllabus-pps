import { Diagnostic, DiagnosticSeverity } from "../types";

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  const severityRank: Record<DiagnosticSeverity, number> = { error: 0, warning: 1, info: 2 };
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
