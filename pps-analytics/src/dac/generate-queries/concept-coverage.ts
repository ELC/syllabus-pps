import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CurriculumGraph } from "../../types";
import {
  collectCourseBlockCoverage,
  collectPerCourseConceptCoverage,
  collectPerYearConceptCoverage,
} from "../projections";
import { renderRowsSql } from "../sql/render";
import { writeMetricSql } from "./metric";

export function writeConceptCoverageQueries(dashboardsDir: string, graph: CurriculumGraph): void {
  const dir = join(dashboardsDir, "queries", "concept-coverage");
  mkdirSync(dir, { recursive: true });

  const courseBlockCoverage = collectCourseBlockCoverage(graph);
  const totalBlocks = courseBlockCoverage.length;
  const coveredBlocks = courseBlockCoverage.filter((block) => block.conceptLinks.length > 0).length;
  const missingBlocks = totalBlocks - coveredBlocks;
  const coveragePercent = totalBlocks === 0 ? 100 : (coveredBlocks / totalBlocks) * 100;

  writeMetricSql(join(dir, "course-notes.sql"), totalBlocks);
  writeMetricSql(join(dir, "notes-with-concepts.sql"), coveredBlocks);
  writeMetricSql(join(dir, "missing-concept-links.sql"), missingBlocks);
  writeMetricSql(join(dir, "coverage-percent.sql"), coveragePercent.toFixed(2));

  writeFileSync(
    join(dir, "coverage-by-year.sql"),
    `${renderRowsSql(
      ["year", "notes", "covered", "missing", "coverage_percent"],
      collectPerYearConceptCoverage(graph, courseBlockCoverage),
    )}\n`,
  );
  writeFileSync(
    join(dir, "coverage-by-course.sql"),
    `${renderRowsSql(
      ["course", "notes", "covered", "missing", "coverage_percent"],
      collectPerCourseConceptCoverage(courseBlockCoverage),
    )}\n`,
  );
  writeFileSync(
    join(dir, "notes-missing-concept-links.sql"),
    `${renderRowsSql(
      ["course", "line", "note"],
      courseBlockCoverage
        .filter((block) => block.conceptLinks.length === 0)
        .map((block) => [block.course, block.line.toString(), block.text]),
    )}\n`,
  );
  writeFileSync(
    join(dir, "covered-notes.sql"),
    `${renderRowsSql(
      ["course", "line", "concept_links", "note"],
      courseBlockCoverage
        .filter((block) => block.conceptLinks.length > 0)
        .map((block) => [
          block.course,
          block.line.toString(),
          block.conceptLinks.join(", "),
          block.text,
        ]),
    )}\n`,
  );
}
