import { watchAnalytics } from "../../pipeline/watch-analytics";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default function watch(this: CliContext, flags: AnalyticsFlags): void {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  watchAnalytics(options);
}
