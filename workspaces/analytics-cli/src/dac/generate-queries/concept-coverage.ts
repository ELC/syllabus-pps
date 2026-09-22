import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CurriculumGraph } from "../../types";
import { postgresDatasetSql } from "../sql/postgres-templates";
import { writeMetricSql } from "./metric";

export function writeConceptCoverageQueries(dashboardsDir: string, _graph: CurriculumGraph): void {
  const dir = join(dashboardsDir, "queries", "concept-coverage");
  mkdirSync(dir, { recursive: true });

  writeMetricSql(join(dir, "course-notes.sql"), "concept-coverage.course-notes");
  writeMetricSql(join(dir, "notes-with-concepts.sql"), "concept-coverage.notes-with-concepts");
  writeMetricSql(join(dir, "missing-concept-links.sql"), "concept-coverage.missing-concept-links");
  writeMetricSql(join(dir, "coverage-percent.sql"), "concept-coverage.coverage-percent");

  writeFileSync(
    join(dir, "coverage-by-year.sql"),
    `${postgresDatasetSql("concept-coverage.by-year", [
      "year",
      "notes",
      "covered",
      "missing",
      "coverage_percent",
    ])}\n`,
  );
  writeFileSync(
    join(dir, "coverage-by-course.sql"),
    `${postgresDatasetSql("concept-coverage.by-course", [
      "course",
      "notes",
      "covered",
      "missing",
      "coverage_percent",
    ])}\n`,
  );
  writeFileSync(
    join(dir, "notes-missing-concept-links.sql"),
    `${postgresDatasetSql("concept-coverage.notes-missing", ["course", "line", "note"])}\n`,
  );
  writeFileSync(
    join(dir, "covered-notes.sql"),
    `${postgresDatasetSql("concept-coverage.covered-notes", [
      "course",
      "line",
      "concept_links",
      "note",
    ])}\n`,
  );
}
