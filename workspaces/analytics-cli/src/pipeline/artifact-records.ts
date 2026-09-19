import { exportToCytoscape } from "@pps/core";

import { buildStaticDashboards } from "../artifacts/static-dashboard";
import type { CurriculumGraph, Diagnostic } from "../types";

export const ANALYTICS_ARTIFACT_KEYS = [
  "curriculum-graph",
  "graph-cy",
  "diagnostics",
  "dashboards",
] as const;

export type AnalyticsArtifactKey = (typeof ANALYTICS_ARTIFACT_KEYS)[number];

const FILENAME_TO_KEY: Record<string, AnalyticsArtifactKey> = {
  "curriculum-graph.json": "curriculum-graph",
  "graph.cy.json": "graph-cy",
  "diagnostics.json": "diagnostics",
  "dashboards.json": "dashboards",
};

export function analyticsArtifactKeyFromFilename(filename: string): AnalyticsArtifactKey | undefined {
  return FILENAME_TO_KEY[filename];
}

export function analyticsArtifactFilenameFromKey(key: AnalyticsArtifactKey): string {
  switch (key) {
    case "curriculum-graph":
      return "curriculum-graph.json";
    case "graph-cy":
      return "graph.cy.json";
    case "diagnostics":
      return "diagnostics.json";
    case "dashboards":
      return "dashboards.json";
  }
}

export function buildArtifactRecords(
  graph: CurriculumGraph,
  diagnostics: Diagnostic[],
): Record<AnalyticsArtifactKey, unknown> {
  return {
    "curriculum-graph": graph,
    "graph-cy": exportToCytoscape(graph),
    diagnostics,
    dashboards: buildStaticDashboards(graph, diagnostics),
  };
}
