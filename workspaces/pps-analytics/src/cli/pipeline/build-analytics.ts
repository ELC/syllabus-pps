import { resolve } from "node:path";
import { loadConfig } from "../../config";
import { collectDiagnostics } from "../../diagnostics";
import { buildGraph } from "../../graph";
import type { AnalyticsRunOptions } from "../parameters/analytics";

export function buildAnalytics(options: AnalyticsRunOptions): {
  graph: ReturnType<typeof buildGraph>;
  diagnostics: ReturnType<typeof collectDiagnostics>;
} {
  const config = loadConfig(options.config);
  const graph = buildGraph({
    contentDir: resolve(options.contentDir),
    config,
  });
  const diagnostics = collectDiagnostics(graph);

  return { graph, diagnostics };
}
