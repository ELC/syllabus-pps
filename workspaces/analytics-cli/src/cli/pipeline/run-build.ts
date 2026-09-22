import { createServerClientFromEnv, replaceAnalyticsArtifacts, replaceDacAnalyticsData } from "@pps/content";

import { writeOutputs } from "../../artifacts";
import { writeDacProject } from "../../dac";
import type { AnalyticsRunOptions } from "../parameters/analytics";
import { hasErrors } from "../validation/exit-code";
import { buildDacSyncPayload } from "../../dac/sync-dac-data";
import { buildArtifactRecords } from "../../pipeline/artifact-records";
import { buildAnalytics } from "./build-analytics";

export async function runBuild(options: AnalyticsRunOptions): Promise<number> {
  const { graph, diagnostics } = await buildAnalytics(options);
  const outputs = writeOutputs({ outDir: options.out, graph, diagnostics });
  const dacDir = writeDacProject({ outDir: options.out, graph, diagnostics });

  if (!options.useLocalContent) {
    try {
      const client = createServerClientFromEnv();
      await replaceAnalyticsArtifacts(client, buildArtifactRecords(graph, diagnostics));
      await replaceDacAnalyticsData(client, buildDacSyncPayload(graph, diagnostics));
      process.stdout.write("Synced analytics artifacts and DAC tables to Supabase Postgres\n");
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : JSON.stringify(error);
      process.stderr.write(
        `Warning: failed to sync analytics artifacts to Supabase: ${detail}\n` +
          `(Apply workspaces/content/sql/003–005 if analytics tables are missing.)\n`,
      );
    }
  }

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
