import { analyticsFlags } from "./analytics";

export const syncPullFlags = {
  ...analyticsFlags,
  "allow-conflicts": {
    kind: "boolean" as const,
    brief: "Exit successfully when merge conflicts remain (repo content wins).",
    default: false,
  },
};

export const syncPullParameters = {
  flags: syncPullFlags,
};

export interface SyncPullFlags {
  content?: string;
  config?: string;
  out: string;
  "allow-conflicts": boolean;
}
