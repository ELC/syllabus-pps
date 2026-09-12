import { syncPull } from "../../../sync";
import type { CliContext } from "../../context";
import type { SyncPullFlags } from "../../parameters/sync-pull";
import { toAnalyticsRunOptions } from "../../parameters/analytics";
import { assertContentDir } from "../../validation/content";

export default async function syncPullCommand(this: CliContext, flags: SyncPullFlags): Promise<void> {
  const options = toAnalyticsRunOptions(flags);
  assertContentDir(options.contentDir);
  const result = await syncPull(options.contentDir);
  this.process.stdout.write(
    `Pulled ${result.written} page(s). Conflicts: ${result.conflicts.length}\n`,
  );
  if (result.conflicts.length > 0) {
    const slugs = result.conflicts.map((conflict) => conflict.slug).join(", ");
    this.process.stdout.write(`Conflict slugs (repo kept): ${slugs}\n`);
    if (!flags["allow-conflicts"]) {
      this.process.exitCode = 1;
    }
  }
}
