import { staticFilterAllValue } from "@pps/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uniqueSorted } from "../../normalize";
import { CurriculumGraph } from "../../types";
import { collectCourseConceptRows } from "../projections";
import { postgresExpectedCurriculumSql } from "../sql/postgres-templates";
import { writeMetricSql } from "./metric";

export function writeCurriculumMapQueries(dashboardsDir: string, graph: CurriculumGraph): void {
  const queriesDir = join(dashboardsDir, "queries", "curriculum-map");
  const generatedDir = join(dashboardsDir, "generated");
  mkdirSync(queriesDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const courseConceptRows = collectCourseConceptRows(graph);

  writeMetricSql(join(queriesDir, "expected-years.sql"), "curriculum-map.expected-years");
  writeMetricSql(join(queriesDir, "expected-courses.sql"), "curriculum-map.expected-courses");
  writeMetricSql(join(queriesDir, "linked-concepts.sql"), "curriculum-map.linked-concepts");
  writeMetricSql(join(queriesDir, "all-pages.sql"), "curriculum-map.all-pages");

  writeFileSync(
    join(queriesDir, "expected-curriculum.sql"),
    `${postgresExpectedCurriculumSql()}\n`,
  );

  writeFileSync(
    join(generatedDir, "curriculum-map-filters.json"),
    `${JSON.stringify(
      {
        year: [staticFilterAllValue, ...graph.expected.years.map((year) => year.title)],
        course: [
          staticFilterAllValue,
          ...uniqueSorted(
            graph.expected.years.flatMap((year) => year.courses.map((course) => course)),
          ),
        ],
        concept: [
          staticFilterAllValue,
          ...uniqueSorted(courseConceptRows.map(([, , concept]) => concept)),
        ],
      },
      null,
      2,
    )}\n`,
  );
}
