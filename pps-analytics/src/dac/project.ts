import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeCurriculumGraphArtifact, writeDiagnosticsArtifact } from "../artifacts/write-json";
import {
  createGeneratedFileMeta,
  renderGeneratedCommentFile,
  renderGeneratedHeaderLine,
  resolveGeneratedDacDir,
  resolveGeneratedDir,
} from "../generated";
import { ROOT_README_DAC } from "../paths";
import { CurriculumGraph, Diagnostic } from "../types";
import { renderBruinConfig } from "./bruin";
import { copyDashboardSources } from "./copy-dashboards";
import { writeDashboardQueries } from "./generate-queries";

export function writeDacProject(input: {
  outDir: string;
  graph: CurriculumGraph;
  diagnostics: Diagnostic[];
}): string {
  const generatedDir = resolveGeneratedDir(input.outDir);
  const dacDir = resolveGeneratedDacDir(input.outDir);
  const dataDir = join(dacDir, "data");
  const dashboardsDir = join(dacDir, "dashboards");
  mkdirSync(generatedDir, { recursive: true });
  rmSync(dacDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(dashboardsDir, { recursive: true });

  const generatedAt = input.graph.generatedAt;
  const generator = "dac/project.ts:writeDacProject";

  writeCurriculumGraphArtifact({
    path: join(dataDir, "curriculum-graph.json"),
    graph: input.graph,
    generator,
    docs: ROOT_README_DAC,
  });
  writeDiagnosticsArtifact({
    path: join(dataDir, "diagnostics.json"),
    diagnostics: input.diagnostics,
    generatedAt,
    generator,
    docs: ROOT_README_DAC,
  });

  writeDashboardQueries(dashboardsDir, input.graph, input.diagnostics);
  copyDashboardSources(dashboardsDir, generatedAt);

  writeFileSync(
    join(dacDir, ".bruin.yml"),
    renderGeneratedCommentFile(
      createGeneratedFileMeta({
        generator,
        kind: "bruin-config",
        generatedAt,
        docs: ROOT_README_DAC,
      }),
      renderBruinConfig(),
      "#",
    ),
  );
  writeFileSync(
    join(dacDir, "README.md"),
    renderGeneratedHeaderLine(
      createGeneratedFileMeta({
        generator,
        kind: "readme",
        generatedAt,
        docs: ROOT_README_DAC,
      }),
    ),
  );

  return dacDir;
}
