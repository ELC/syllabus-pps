import { runBuild } from "../../pipeline/run-build";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default function build(this: CliContext, flags: AnalyticsFlags): void {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  this.process.exitCode = runBuild(options);
}
