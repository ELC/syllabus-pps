import { buildCommand } from "@stricli/core";
import type { CliContext } from "../../context";
import type { ServeDacFlags } from "../../parameters/serve-dac";
import { serveDacParameters } from "../../parameters/serve-dac";

export const command = buildCommand<ServeDacFlags, [], CliContext>({
  loader: () => import("./impl"),
  parameters: serveDacParameters,
  docs: {
    brief: "Serve the generated Bruin DAC dashboard project.",
  },
});
