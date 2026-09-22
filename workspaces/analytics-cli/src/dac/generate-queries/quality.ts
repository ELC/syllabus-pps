import { staticFilterAllValue } from "@pps/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uniqueSorted } from "../../normalize";
import { CurriculumGraph, Diagnostic } from "../../types";
import { postgresDiagnosticsSql } from "../sql/postgres-templates";
import { writeMetricSql } from "./metric";

export function writeQualityQueries(
  dashboardsDir: string,
  _graph: CurriculumGraph,
  diagnostics: Diagnostic[],
): void {
  const queriesDir = join(dashboardsDir, "queries", "quality");
  const generatedDir = join(dashboardsDir, "generated");
  mkdirSync(queriesDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  writeMetricSql(join(queriesDir, "pages.sql"), "quality.pages");
  writeMetricSql(join(queriesDir, "edges.sql"), "quality.edges");
  writeMetricSql(join(queriesDir, "expected-courses.sql"), "quality.expected-courses");
  writeMetricSql(join(queriesDir, "errors.sql"), "quality.errors");
  writeMetricSql(join(queriesDir, "warnings.sql"), "quality.warnings");
  writeMetricSql(join(queriesDir, "concept-pages.sql"), "quality.concept-pages");
  writeMetricSql(join(queriesDir, "course-pages.sql"), "quality.course-pages");
  writeMetricSql(join(queriesDir, "year-pages.sql"), "quality.year-pages");

  writeFileSync(join(queriesDir, "diagnostics.sql"), `${postgresDiagnosticsSql()}\n`);

  writeFileSync(
    join(generatedDir, "quality-filters.json"),
    `${JSON.stringify(
      {
        severity: [staticFilterAllValue, ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.severity))],
        code: [staticFilterAllValue, ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.code))],
        page: [
          staticFilterAllValue,
          ...uniqueSorted(
            diagnostics.map((diagnostic) => diagnostic.page ?? "").filter(Boolean),
          ),
        ],
      },
      null,
      2,
    )}\n`,
  );

}
