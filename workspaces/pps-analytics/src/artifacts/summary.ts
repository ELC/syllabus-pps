import { CurriculumGraph, Diagnostic } from "../types";

export function renderSummary(graph: CurriculumGraph, diagnostics: Diagnostic[]): string {
  const bySeverity = countBy(diagnostics, (diagnostic) => diagnostic.severity);
  const byKind = countBy(graph.pages, (page) => page.kind);

  const lines = [
    "# PPS Zettelkasten Analytics Summary",
    "",
    "## Graph",
    `- Pages: ${graph.pages.length}`,
    `- Edges: ${graph.edges.length}`,
    `- Expected years: ${graph.expected.years.length}`,
    `- Expected courses: ${graph.expected.years.flatMap((year) => year.courses).length}`,
    "",
    "## Page Kinds",
    ...[...byKind.entries()].map(([kind, count]) => `- ${kind}: ${count}`),
    "",
    "## Diagnostics",
    `- Errors: ${bySeverity.get("error") ?? 0}`,
    `- Warnings: ${bySeverity.get("warning") ?? 0}`,
    `- Info: ${bySeverity.get("info") ?? 0}`,
    "",
  ];

  if (diagnostics.length > 0) {
    lines.push("## Findings", ...diagnostics.map(formatDiagnostic), "");
  }

  return `${lines.join("\n")}\n`;
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = diagnostic.page
    ? ` (${diagnostic.page}${diagnostic.line ? `:${diagnostic.line}` : ""})`
    : "";
  return `- ${diagnostic.severity.toUpperCase()} ${diagnostic.code}${location}: ${diagnostic.message}`;
}

function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Map([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "es-AR")));
}
