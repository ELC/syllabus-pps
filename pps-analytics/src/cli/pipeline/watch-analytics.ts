import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AnalyticsRunOptions } from "../parameters/analytics";
import { runBuild } from "./run-build";
import { snapshotBuildInputs } from "./snapshot";

export function watchAnalytics(options: AnalyticsRunOptions): void {
  const contentDir = resolve(options.contentDir);
  const watchDirs = existsSync(contentDir) ? [contentDir] : [];
  const watchFiles = options.config && existsSync(resolve(options.config))
    ? [resolve(options.config)]
    : [];

  if (watchDirs.length === 0) {
    throw new Error(`Content pages directory not found at ${contentDir}.`);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let isBuilding = false;
  let queued = false;

  const run = (reason: string) => {
    if (isBuilding) {
      queued = true;
      return;
    }

    try {
      isBuilding = true;
      process.stdout.write(`[pps-analytics] build started: ${reason}\n`);
      const exitCode = runBuild(options);
      process.stdout.write(
        `[pps-analytics] build ${exitCode === 0 ? "completed" : `completed with errors (${exitCode})`}\n`,
      );
    } catch (error) {
      process.stderr.write(
        `[pps-analytics] build failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    } finally {
      isBuilding = false;

      if (queued) {
        queued = false;
        run("queued change");
      }
    }
  };

  const schedule = (reason: string) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => run(reason), 300);
  };

  let lastSnapshot = snapshotBuildInputs(watchDirs, watchFiles);
  const interval = setInterval(() => {
    const nextSnapshot = snapshotBuildInputs(watchDirs, watchFiles);
    if (nextSnapshot === lastSnapshot) {
      return;
    }

    lastSnapshot = nextSnapshot;
    schedule("content change");
  }, 1000);

  process.on("SIGINT", () => {
    clearInterval(interval);
    process.stdout.write("\n[pps-analytics] watcher stopped\n");
    process.exit(0);
  });

  run("initial");
  process.stdout.write(
    `[pps-analytics] watching ${[...watchDirs, ...watchFiles].join(", ")}\n`,
  );
}
