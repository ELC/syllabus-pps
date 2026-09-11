import { buildApplication, buildRouteMap, help } from "@stricli/core";
import { command as buildCommand } from "./commands/build/command";
import { command as inspectCommand } from "./commands/inspect/command";
import { command as serveDacCommand } from "./commands/serve-dac/command";
import { command as watchCommand } from "./commands/watch/command";
import { command as syncPullCommand } from "./commands/sync-pull/command";
import { command as syncPushCommand } from "./commands/sync-push/command";
import { command as syncStatusCommand } from "./commands/sync-status/command";
import type { CliContext } from "./context";

const routes = buildRouteMap({
  routes: {
    inspect: inspectCommand,
    build: buildCommand,
    watch: watchCommand,
    "serve-dac": serveDacCommand,
    "sync-pull": syncPullCommand,
    "sync-push": syncPushCommand,
    "sync-status": syncStatusCommand,
  },
  defaultCommand: "inspect",
  docs: {
    brief: "Typed analytics CLI for the PPS curriculum content graph.",
  },
});

export const app = buildApplication<CliContext>(
  routes,
  {
    name: "pps-analytics",
    scanner: {
      caseStyle: "allow-kebab-for-camel",
    },
  },
  {
    help: help({
      brief: "Print help information and exit.",
      formatting: {
        useAliasInUsageLine: false,
        onlyRequiredInUsageLine: false,
        caseStyle: "convert-camel-to-kebab",
      },
    }),
  },
);
