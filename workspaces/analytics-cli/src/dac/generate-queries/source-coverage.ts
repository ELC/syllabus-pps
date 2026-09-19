import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CurriculumGraph } from "../../types";
import { postgresDatasetSql } from "../sql/postgres-templates";
import { writeMetricSql } from "./metric";

export function writeSourceCoverageQueries(dashboardsDir: string, _graph: CurriculumGraph): void {
  const queriesDir = join(dashboardsDir, "queries", "source-coverage");
  mkdirSync(queriesDir, { recursive: true });

  writeMetricSql(join(queriesDir, "linked-concept-notes.sql"), "source-coverage.linked-concept-notes");
  writeMetricSql(join(queriesDir, "notes-with-sources.sql"), "source-coverage.notes-with-sources");
  writeMetricSql(join(queriesDir, "missing-source-links.sql"), "source-coverage.missing-source-links");
  writeMetricSql(
    join(queriesDir, "source-coverage-percent.sql"),
    "source-coverage.source-coverage-percent",
  );

  writeFileSync(
    join(queriesDir, "source-coverage-by-year.sql"),
    `${postgresDatasetSql("source-coverage.by-year", [
      "year",
      "concept_notes",
      "sourced",
      "missing",
      "coverage_percent",
    ])}\n`,
  );
  writeFileSync(
    join(queriesDir, "source-coverage-by-course.sql"),
    `${postgresDatasetSql("source-coverage.by-course", [
      "year",
      "course",
      "concept_notes",
      "sourced",
      "missing",
      "coverage_percent",
    ])}\n`,
  );
  writeFileSync(
    join(queriesDir, "concept-note-sources.sql"),
    `${postgresDatasetSql("source-coverage.concept-note-sources", [
      "year",
      "course",
      "concept",
      "line",
      "has_source",
      "source_links",
      "note",
    ])}\n`,
  );
}
