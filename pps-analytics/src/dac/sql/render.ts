import { Diagnostic } from "../../types";
import { ConceptMapRow } from "../projections";

export function renderDiagnosticsSql(diagnostics: Diagnostic[]): string {
  return `WITH diagnostics AS (
${indentSql(
  renderRowsSql(
    ["severity", "code", "page", "line", "message"],
    diagnostics.map((diagnostic) => [
      diagnostic.severity,
      diagnostic.code,
      diagnostic.page ?? "",
      diagnostic.line?.toString() ?? "",
      diagnostic.message,
    ]),
  ),
  2,
)}
)
SELECT severity, code, page, line, message
FROM diagnostics
WHERE ('{{ filters.severity }}' = 'All' OR severity = '{{ filters.severity }}')
  AND ('{{ filters.code }}' = 'All' OR code = '{{ filters.code }}')
  AND ('{{ filters.page }}' = 'All' OR page = '{{ filters.page }}')
ORDER BY severity, code, page, line`;
}

export function renderExpectedCurriculumSql(rows: string[][]): string {
  return `WITH expected AS (
${indentSql(renderRowsSql(["year", "course", "concept"], rows), 2)}
)
SELECT year, course, concept
FROM expected
WHERE ('{{ filters.year }}' = 'All' OR year = '{{ filters.year }}')
  AND ('{{ filters.course }}' = 'All' OR course = '{{ filters.course }}')
  AND ('{{ filters.concept }}' = 'All' OR concept = '{{ filters.concept }}')
ORDER BY year, course, concept`;
}

export function renderConceptMapSql(rows: ConceptMapRow[]): string {
  return `WITH concept_sources AS (
${indentSql(
  renderRowsSql(
    ["concept", "source_type", "source", "line"],
    rows.map((row) => [
      row.concept,
      row.sourceType,
      row.source,
      row.line,
    ]),
  ),
  2,
)}
)
SELECT concept, source_type, source, line
FROM concept_sources
WHERE ('{{ filters.source_type }}' = 'All' OR source_type = '{{ filters.source_type }}')
ORDER BY concept, source_type, source`;
}

export function renderRowsSql(columns: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return [
      "SELECT",
      ...columns.map(
        (column, index) =>
          `  CAST(NULL AS VARCHAR) AS ${column}${index === columns.length - 1 ? "" : ","}`,
      ),
      "WHERE false",
    ].join("\\n");
  }

  const values = rows
    .map((row) => `(${row.map((value) => `'${sqlEscape(value)}'`).join(", ")})`)
    .join(",\\n    ");

  return `SELECT * FROM (VALUES
    ${values}
  ) AS rows(${columns.join(", ")})`;
}

export function indentSql(sql: string, spaces: number): string {
  const indentation = " ".repeat(spaces);
  return sql
    .split("\n")
    .map((line) => `${indentation}${line}`)
    .join("\n");
}

function sqlEscape(value: string): string {
  return value.replaceAll("'", "''");
}
