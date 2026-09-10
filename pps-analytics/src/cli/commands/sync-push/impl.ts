import { syncPush } from "../../../sync";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default async function syncPushCommand(this: CliContext, flags: AnalyticsFlags): Promise<void> {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  const result = await syncPush(options.contentDir);
  this.process.stdout.write(
    `Pushed ${result.uploaded} page(s). Conflicts: ${result.conflicts.length}\n`,
  );
  if (result.conflicts.length > 0) {
    this.process.exitCode = 1;
  }
}
