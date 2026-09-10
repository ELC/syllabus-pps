import { writeDacProject } from "../../dac";
import { writeOutputs } from "../../artifacts";
import type { AnalyticsRunOptions } from "../parameters/analytics";
import { hasErrors } from "../validation/exit-code";
import { buildAnalytics } from "./build-analytics";

export function runBuild(options: AnalyticsRunOptions): number {
  const { graph, diagnostics } = buildAnalytics(options);
  const outputs = writeOutputs({ outDir: options.out, graph, diagnostics });
  const dacDir = writeDacProject({ outDir: options.out, graph, diagnostics });
  process.stdout.write(
    [
      `Wrote ${outputs.curriculumGraphPath}`,
      `Wrote ${outputs.cytoscapeGraphPath}`,
      `Wrote ${outputs.diagnosticsPath}`,
      `Wrote ${outputs.dashboardsPath}`,
      `Wrote ${outputs.summaryPath}`,
      `Wrote DAC project ${dacDir}`,
      "",
    ].join("\n"),
  );

  return hasErrors(diagnostics) ? 1 : 0;
}
