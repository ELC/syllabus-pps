import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uniqueSorted } from "../../normalize";
import { CurriculumGraph, Diagnostic } from "../../types";
import { countPagesByKind } from "../projections";
import { renderDiagnosticsSql } from "../sql/render";
import { writeMetricSql } from "./metric";

export function writeQualityQueries(
  dashboardsDir: string,
  graph: CurriculumGraph,
  diagnostics: Diagnostic[],
): void {
  const queriesDir = join(dashboardsDir, "queries", "quality");
  const generatedDir = join(dashboardsDir, "generated");
  mkdirSync(queriesDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  const expectedCourses = graph.expected.years.flatMap((year) => year.courses).length;

  writeMetricSql(join(queriesDir, "pages.sql"), graph.pages.length);
  writeMetricSql(join(queriesDir, "edges.sql"), graph.edges.length);
  writeMetricSql(join(queriesDir, "expected-courses.sql"), expectedCourses);
  writeMetricSql(join(queriesDir, "errors.sql"), errors);
  writeMetricSql(join(queriesDir, "warnings.sql"), warnings);
  writeMetricSql(join(queriesDir, "concept-pages.sql"), countPagesByKind(graph, "concept"));
  writeMetricSql(join(queriesDir, "course-pages.sql"), countPagesByKind(graph, "course"));
  writeMetricSql(join(queriesDir, "year-pages.sql"), countPagesByKind(graph, "year"));

  writeFileSync(join(queriesDir, "diagnostics.sql"), `${renderDiagnosticsSql(diagnostics)}\n`);

  writeFileSync(
    join(generatedDir, "quality-filters.json"),
    `${JSON.stringify(
      {
        severity: ["All", ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.severity))],
        code: ["All", ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.code))],
        page: [
          "All",
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
