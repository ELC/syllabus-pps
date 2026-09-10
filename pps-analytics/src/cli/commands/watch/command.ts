import { buildCommand } from "@stricli/core";
import type { CliContext } from "../../context";
import type { AnalyticsFlags } from "../../parameters/analytics";
import { analyticsParameters } from "../../parameters/analytics";

export const command = buildCommand<AnalyticsFlags, [], CliContext>({
  loader: () => import("./impl"),
  parameters: analyticsParameters,
  docs: {
    brief: "Rebuild analytics when the mirror or config changes.",
  },
});
