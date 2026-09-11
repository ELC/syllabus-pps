import { CurriculumGraph, Diagnostic } from "../../types";
import { writeConceptCoverageQueries } from "./concept-coverage";
import { writeConceptMapQueries } from "./concept-map";
import { writeCurriculumMapQueries } from "./curriculum-map";
import { writeQualityQueries } from "./quality";
import { writeSourceCoverageQueries } from "./source-coverage";

export function writeDashboardQueries(
  dashboardsDir: string,
  graph: CurriculumGraph,
  diagnostics: Diagnostic[],
): void {
  writeQualityQueries(dashboardsDir, graph, diagnostics);
  writeCurriculumMapQueries(dashboardsDir, graph);
  writeConceptMapQueries(dashboardsDir, graph);
  writeConceptCoverageQueries(dashboardsDir, graph);
  writeSourceCoverageQueries(dashboardsDir, graph);
}
