import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
  const dashboardsDir = join(dacDir, "dashboards");
  mkdirSync(generatedDir, { recursive: true });
  rmSync(dacDir, { recursive: true, force: true });
  mkdirSync(dashboardsDir, { recursive: true });

  const generatedAt = input.graph.generatedAt;
  const generator = "dac/project.ts:writeDacProject";

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
