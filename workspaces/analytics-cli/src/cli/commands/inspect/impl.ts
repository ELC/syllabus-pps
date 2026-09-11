import { renderSummary } from "../../../artifacts";
import { buildAnalytics } from "../../pipeline/build-analytics";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { hasErrors } from "../../validation/exit-code";
import { assertContentDir } from "../../validation/content";

export default function inspect(this: CliContext, flags: AnalyticsFlags): void {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  const { graph, diagnostics } = buildAnalytics(options);
  this.process.stdout.write(renderSummary(graph, diagnostics));

  if (hasErrors(diagnostics)) {
    this.process.exitCode = 1;
  }
}
