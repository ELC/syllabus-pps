import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uniqueSorted } from "../../normalize";
import { CurriculumGraph } from "../../types";
import { collectConceptMapRows } from "../projections";
import { renderConceptMapSql } from "../sql/render";
import { writeMetricSql } from "./metric";

export function writeConceptMapQueries(dashboardsDir: string, graph: CurriculumGraph): void {
  const queriesDir = join(dashboardsDir, "queries", "concept-map");
  const generatedDir = join(dashboardsDir, "generated");
  mkdirSync(queriesDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const rows = collectConceptMapRows(graph);
  const conceptCount = graph.pages.filter((page) => page.kind === "concept").length;
  const sourcedConcepts = new Set(
    rows.filter((row) => row.sourceType !== "(missing)").map((row) => row.concept),
  );
  const sourceLinks = rows.filter((row) => row.sourceType !== "(missing)").length;

  writeMetricSql(join(queriesDir, "concepts.sql"), conceptCount);
  writeMetricSql(join(queriesDir, "concepts-with-sources.sql"), sourcedConcepts.size);
  writeMetricSql(join(queriesDir, "concepts-missing-sources.sql"), conceptCount - sourcedConcepts.size);
  writeMetricSql(join(queriesDir, "source-links.sql"), sourceLinks);

  writeFileSync(join(queriesDir, "concept-sources.sql"), `${renderConceptMapSql(rows)}\n`);

  writeFileSync(
    join(generatedDir, "concept-map-filters.json"),
    `${JSON.stringify(
      {
        source_type: ["All", ...uniqueSorted(rows.map((row) => row.sourceType))],
      },
      null,
      2,
    )}\n`,
  );
}
