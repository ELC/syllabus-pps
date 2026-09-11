import {
  resolveAnalyticsConfig,
  resolveContentDir,
  resolveDefaultOutDir,
} from "../../paths";

export const analyticsFlags = {
  content: {
    kind: "parsed" as const,
    parse: String,
    brief: "Path to the flat markdown pages directory.",
    optional: true as const,
  },
  config: {
    kind: "parsed" as const,
    parse: String,
    brief: "Path to the expected curriculum config.",
    optional: true as const,
  },
  out: {
    kind: "parsed" as const,
    parse: String,
    brief: "Output directory for generated analytics.",
    default: resolveDefaultOutDir(),
  },
};

export const analyticsParameters = {
  flags: analyticsFlags,
};

export interface AnalyticsFlags {
  content?: string;
  config?: string;
  out: string;
}

export interface AnalyticsRunOptions {
  contentDir: string;
  config?: string;
  out: string;
}

export function toAnalyticsRunOptions(flags: AnalyticsFlags): AnalyticsRunOptions {
  const configPath = resolveAnalyticsConfig(flags.config);
  return {
    contentDir: resolveContentDir({ configPath, cliContentDir: flags.content }),
    config: configPath,
    out: flags.out,
  };
}
