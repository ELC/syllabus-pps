import { buildCommand } from "@stricli/core";
import type { CliContext } from "../../context";

export const command = buildCommand<Record<string, never>, [], CliContext>({
  loader: () => import("./impl"),
  parameters: { flags: {} },
  docs: { brief: "Show remote page and resource counts in Supabase." },
});
