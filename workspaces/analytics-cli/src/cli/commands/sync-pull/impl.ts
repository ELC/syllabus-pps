import { syncPull } from "../../../sync";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default async function syncPullCommand(this: CliContext, flags: AnalyticsFlags): Promise<void> {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  const result = await syncPull(options.contentDir);
  this.process.stdout.write(
    `Pulled ${result.written} page(s). Conflicts: ${result.conflicts.length}\n`,
  );
  if (result.conflicts.length > 0) {
    this.process.exitCode = 1;
  }
}
