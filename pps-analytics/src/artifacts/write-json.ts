import { writeFileSync } from "node:fs";
import { exportToCytoscape } from "@pps/core";
import {
  createGeneratedFileMeta,
  renderGeneratedJsonFile,
} from "../generated";
import { CurriculumGraph, Diagnostic } from "../types";
import { StaticDashboardExport } from "./static-dashboard";

export function writeCurriculumGraphArtifact(input: {
  path: string;
  graph: CurriculumGraph;
  generator: string;
  docs?: string;
}): void {
  writeFileSync(
    input.path,
    renderGeneratedJsonFile(
      createGeneratedFileMeta({
        generator: input.generator,
        kind: "curriculum-graph",
        generatedAt: input.graph.generatedAt,
        docs: input.docs,
      }),
      input.graph,
    ),
  );
}

/** @deprecated Use writeCurriculumGraphArtifact */
export const writeGraphArtifact = writeCurriculumGraphArtifact;

export function writeCytoscapeGraphArtifact(input: {
  path: string;
  graph: CurriculumGraph;
  generator: string;
  docs?: string;
}): void {
  writeFileSync(
    input.path,
    renderGeneratedJsonFile(
      createGeneratedFileMeta({
        generator: input.generator,
        kind: "graph-cy",
        generatedAt: input.graph.generatedAt,
        docs: input.docs,
      }),
      exportToCytoscape(input.graph),
    ),
  );
}

export function writeStaticDashboardsArtifact(input: {
  path: string;
  payload: StaticDashboardExport;
  generator: string;
  docs?: string;
}): void {
  writeFileSync(
    input.path,
    renderGeneratedJsonFile(
      createGeneratedFileMeta({
        generator: input.generator,
        kind: "dashboards",
        generatedAt: input.payload.generatedAt,
        docs: input.docs,
      }),
      input.payload,
    ),
  );
}

export function writeDiagnosticsArtifact(input: {
  path: string;
  diagnostics: Diagnostic[];
  generatedAt: string;
  generator: string;
  docs?: string;
}): void {
  writeFileSync(
    input.path,
    renderGeneratedJsonFile(
      createGeneratedFileMeta({
        generator: input.generator,
        kind: "diagnostics",
        generatedAt: input.generatedAt,
        docs: input.docs,
      }),
      input.diagnostics,
    ),
  );
}
