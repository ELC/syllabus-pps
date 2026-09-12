import { buildCommand } from "@stricli/core";
import type { CliContext } from "../../context";
import type { SyncPullFlags } from "../../parameters/sync-pull";
import { syncPullParameters } from "../../parameters/sync-pull";

export const command = buildCommand<SyncPullFlags, [], CliContext>({
  loader: () => import("./impl"),
  parameters: syncPullParameters,
  docs: { brief: "Pull markdown pages from Supabase into content/pages." },
});
