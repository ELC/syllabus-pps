import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createGeneratedFileMeta,
  renderGeneratedMarkdown,
  resolveGeneratedDir,
} from "../generated";
import { ROOT_README } from "../paths";
import { CurriculumGraph, Diagnostic } from "../types";
import { renderSummary } from "./summary";
import { buildStaticDashboards } from "./static-dashboard";
import {
  writeCurriculumGraphArtifact,
  writeCytoscapeGraphArtifact,
  writeDiagnosticsArtifact,
  writeStaticDashboardsArtifact,
} from "./write-json";

export interface BuildOutputs {
  curriculumGraphPath: string;
  cytoscapeGraphPath: string;
  diagnosticsPath: string;
  dashboardsPath: string;
  summaryPath: string;
}

export function writeOutputs(input: {
  outDir: string;
  graph: CurriculumGraph;
  diagnostics: Diagnostic[];
}): BuildOutputs {
  const generatedDir = resolveGeneratedDir(input.outDir);
  mkdirSync(generatedDir, { recursive: true });

  const curriculumGraphPath = join(generatedDir, "curriculum-graph.json");
  const cytoscapeGraphPath = join(generatedDir, "graph.cy.json");
  const diagnosticsPath = join(generatedDir, "diagnostics.json");
  const dashboardsPath = join(generatedDir, "dashboards.json");
  const summaryPath = join(generatedDir, "summary.md");
  const generatedAt = input.graph.generatedAt;
  const generator = "artifacts/write.ts:writeOutputs";

  writeCurriculumGraphArtifact({
    path: curriculumGraphPath,
    graph: input.graph,
    generator,
    docs: ROOT_README,
  });
  writeCytoscapeGraphArtifact({
    path: cytoscapeGraphPath,
    graph: input.graph,
    generator,
    docs: ROOT_README,
  });
  writeDiagnosticsArtifact({
    path: diagnosticsPath,
    diagnostics: input.diagnostics,
    generatedAt,
    generator,
    docs: ROOT_README,
  });
  writeStaticDashboardsArtifact({
    path: dashboardsPath,
    payload: buildStaticDashboards(input.graph, input.diagnostics),
    generator,
    docs: ROOT_README,
  });
  writeFileSync(
    summaryPath,
    renderGeneratedMarkdown(
      createGeneratedFileMeta({
        generator,
        kind: "summary",
        generatedAt,
        docs: ROOT_README,
      }),
      renderSummary(input.graph, input.diagnostics),
    ),
  );

  return { curriculumGraphPath, cytoscapeGraphPath, diagnosticsPath, dashboardsPath, summaryPath };
}
