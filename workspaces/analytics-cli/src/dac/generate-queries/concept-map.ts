import { staticFilterAllValue } from "@pps/core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uniqueSorted } from "../../normalize";
import { CurriculumGraph } from "../../types";
import { collectConceptMapRows } from "../projections";
import { postgresConceptSourcesSql } from "../sql/postgres-templates";
import { writeMetricSql } from "./metric";

export function writeConceptMapQueries(dashboardsDir: string, graph: CurriculumGraph): void {
  const queriesDir = join(dashboardsDir, "queries", "concept-map");
  const generatedDir = join(dashboardsDir, "generated");
  mkdirSync(queriesDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const rows = collectConceptMapRows(graph);

  writeMetricSql(join(queriesDir, "concepts.sql"), "concept-map.concepts");
  writeMetricSql(join(queriesDir, "concepts-with-sources.sql"), "concept-map.concepts-with-sources");
  writeMetricSql(
    join(queriesDir, "concepts-missing-sources.sql"),
    "concept-map.concepts-missing-sources",
  );
  writeMetricSql(join(queriesDir, "source-links.sql"), "concept-map.source-links");

  writeFileSync(join(queriesDir, "concept-sources.sql"), `${postgresConceptSourcesSql()}\n`);

  writeFileSync(
    join(generatedDir, "concept-map-filters.json"),
    `${JSON.stringify(
      {
        source_type: [staticFilterAllValue, ...uniqueSorted(rows.map((row) => row.sourceType))],
      },
      null,
      2,
    )}\n`,
  );

}
