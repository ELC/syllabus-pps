import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CurriculumGraph } from "../../types";
import {
  collectSourceCoverageRows,
  summarizeSourceCoverageRows,
} from "../projections";
import { renderRowsSql } from "../sql/render";
import { writeMetricSql } from "./metric";

export function writeSourceCoverageQueries(dashboardsDir: string, graph: CurriculumGraph): void {
  const queriesDir = join(dashboardsDir, "queries", "source-coverage");
  mkdirSync(queriesDir, { recursive: true });

  const rows = collectSourceCoverageRows(graph);
  const globalSummary = summarizeSourceCoverageRows(rows, "global")[0] ?? [
    "All",
    "0",
    "0",
    "0",
    "0.0",
  ];

  writeMetricSql(join(queriesDir, "linked-concept-notes.sql"), globalSummary[1] ?? "0");
  writeMetricSql(join(queriesDir, "notes-with-sources.sql"), globalSummary[2] ?? "0");
  writeMetricSql(join(queriesDir, "missing-source-links.sql"), globalSummary[3] ?? "0");
  writeMetricSql(join(queriesDir, "source-coverage-percent.sql"), globalSummary[4] ?? "0.0");

  writeFileSync(
    join(queriesDir, "source-coverage-by-year.sql"),
    `${renderRowsSql(
      ["year", "concept_notes", "sourced", "missing", "coverage_percent"],
      summarizeSourceCoverageRows(
        rows,
        "year",
        graph.expected.years.map((year) => [year.title]),
      ),
    )}\n`,
  );
  writeFileSync(
    join(queriesDir, "source-coverage-by-course.sql"),
    `${renderRowsSql(
      ["year", "course", "concept_notes", "sourced", "missing", "coverage_percent"],
      summarizeSourceCoverageRows(
        rows,
        "course",
        graph.expected.years.flatMap((year) =>
          year.courses.map((course) => [year.title, course]),
        ),
      ),
    )}\n`,
  );
  writeFileSync(
    join(queriesDir, "concept-note-sources.sql"),
    `${renderRowsSql(
      ["year", "course", "concept", "line", "has_source", "source_links", "note"],
      rows.map((row) => [
        row.year,
        row.course,
        row.concept,
        row.line,
        row.hasSource,
        row.sourceLinks,
        row.note,
      ]),
    )}\n`,
  );
}
