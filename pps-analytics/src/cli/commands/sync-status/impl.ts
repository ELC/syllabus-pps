import { syncStatus } from "../../../sync";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default function syncStatusCommand(this: CliContext, flags: AnalyticsFlags): void {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  const status = syncStatus(options.contentDir);
  this.process.stdout.write(
    `Local pages: ${status.localCount}\nConflicts: ${status.conflicts.length}\n`,
  );
}
