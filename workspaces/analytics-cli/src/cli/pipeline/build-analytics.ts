import { resolve } from "node:path";
import { loadConfig } from "../../config";
import { collectDiagnostics } from "../../diagnostics";
import { buildGraph } from "../../graph";
import type { AnalyticsRunOptions } from "../parameters/analytics";

export async function buildAnalytics(options: AnalyticsRunOptions): Promise<{
  graph: Awaited<ReturnType<typeof buildGraph>>;
  diagnostics: ReturnType<typeof collectDiagnostics>;
}> {
  const config = loadConfig(options.config);
  const graph = await buildGraph({
    contentDir: resolve(options.contentDir),
    config,
    useLocalContent: options.useLocalContent,
  });
  const diagnostics = collectDiagnostics(graph);

  return { graph, diagnostics };
}
