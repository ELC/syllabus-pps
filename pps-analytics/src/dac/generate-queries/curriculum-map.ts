import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uniqueSorted } from "../../normalize";
import { CurriculumGraph } from "../../types";
import { collectCourseConceptRows } from "../projections";
import { renderExpectedCurriculumSql } from "../sql/render";
import { writeMetricSql } from "./metric";

export function writeCurriculumMapQueries(dashboardsDir: string, graph: CurriculumGraph): void {
  const queriesDir = join(dashboardsDir, "queries", "curriculum-map");
  const generatedDir = join(dashboardsDir, "generated");
  mkdirSync(queriesDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const courseConceptRows = collectCourseConceptRows(graph);
  const expectedCourseCount = graph.expected.years.flatMap((year) => year.courses).length;
  const linkedConceptCount = uniqueSorted(
    courseConceptRows
      .map(([, , concept]) => concept)
      .filter((concept) => concept !== "(no concept links)"),
  ).length;

  writeMetricSql(join(queriesDir, "expected-years.sql"), graph.expected.years.length);
  writeMetricSql(join(queriesDir, "expected-courses.sql"), expectedCourseCount);
  writeMetricSql(join(queriesDir, "linked-concepts.sql"), linkedConceptCount);
  writeMetricSql(join(queriesDir, "all-pages.sql"), graph.pages.length);

  writeFileSync(
    join(queriesDir, "expected-curriculum.sql"),
    `${renderExpectedCurriculumSql(courseConceptRows)}\n`,
  );

  writeFileSync(
    join(generatedDir, "curriculum-map-filters.json"),
    `${JSON.stringify(
      {
        year: ["All", ...graph.expected.years.map((year) => year.title)],
        course: [
          "All",
          ...uniqueSorted(
            graph.expected.years.flatMap((year) => year.courses.map((course) => course)),
          ),
        ],
        concept: [
          "All",
          ...uniqueSorted(courseConceptRows.map(([, , concept]) => concept)),
        ],
      },
      null,
      2,
    )}\n`,
  );
}
