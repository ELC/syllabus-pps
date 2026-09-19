import { assertSupabaseServerEnv } from "@pps/content";
import { runBuild } from "../../pipeline/run-build";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default async function build(this: CliContext, flags: AnalyticsFlags): Promise<void> {
  const options = toAnalyticsRunOptions(flags);
  if (options.useLocalContent) {
    assertContentDir(options.contentDir);
  } else {
    assertSupabaseServerEnv();
  }
  this.process.exitCode = await runBuild(options);
}
