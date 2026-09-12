import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const PAGE_APPS = ["site", "analytics", "network", "cms", "roadmap"] as const;

/** Merge workspace app dists into a single GitHub Pages artifact at `<repoRoot>/dist`. */
export function mergePagesDist(repoRoot: string): string {
  const combinedDist = join(repoRoot, "dist");
  rmSync(combinedDist, { recursive: true, force: true });
  mkdirSync(combinedDist, { recursive: true });

  for (const app of PAGE_APPS) {
    const appDist = join(repoRoot, "workspaces", app, "dist");
    if (!existsSync(appDist)) {
      continue;
    }

    const target = app === "site" ? combinedDist : join(combinedDist, app);
    if (app !== "site") {
      mkdirSync(target, { recursive: true });
    }
    cpSync(appDist, target, { recursive: true });
  }

  return combinedDist;
}
