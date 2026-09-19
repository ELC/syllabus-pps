import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertSupabaseServerEnv } from "@pps/content";
import type { AnalyticsRunOptions } from "../parameters/analytics";
import { runBuild } from "./run-build";
import { snapshotBuildInputs } from "./snapshot";

const SUPABASE_POLL_MS = 15_000;

export function watchAnalytics(options: AnalyticsRunOptions): void {
  const useLocal = options.useLocalContent;
  const contentDir = resolve(options.contentDir);
  const watchDirs = useLocal && existsSync(contentDir) ? [contentDir] : [];
  const resourcesFile = join(contentDir, "..", "resources.json");
  const watchFiles = useLocal
    ? [
        ...(options.config && existsSync(resolve(options.config)) ? [resolve(options.config)] : []),
        ...(existsSync(resourcesFile) ? [resourcesFile] : []),
      ]
    : options.config && existsSync(resolve(options.config))
      ? [resolve(options.config)]
      : [];

  if (useLocal && watchDirs.length === 0) {
    throw new Error(`Content pages directory not found at ${contentDir}.`);
  }

  if (!useLocal) {
    assertSupabaseServerEnv();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let isBuilding = false;
  let queued = false;

  const run = (reason: string) => {
    if (isBuilding) {
      queued = true;
      return;
    }

    void (async () => {
      try {
        isBuilding = true;
        process.stdout.write(`[pps-analytics] build started: ${reason}\n`);
        const exitCode = await runBuild(options);
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
    })();
  };

  const schedule = (reason: string) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => run(reason), 300);
  };

  if (useLocal) {
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

    process.stdout.write(
      `[pps-analytics] watching ${[...watchDirs, ...watchFiles].join(", ")}\n`,
    );
  } else {
    const interval = setInterval(() => schedule("supabase poll"), SUPABASE_POLL_MS);
    process.on("SIGINT", () => {
      clearInterval(interval);
      process.stdout.write("\n[pps-analytics] watcher stopped\n");
      process.exit(0);
    });

    process.stdout.write(`[pps-analytics] polling Supabase every ${SUPABASE_POLL_MS / 1000}s\n`);
  }

  run("initial");
}
