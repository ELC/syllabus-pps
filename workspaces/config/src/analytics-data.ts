import { createReadStream, cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const defaultGeneratedDir = join(repoRoot, "workspaces/analytics-cli/_generated");

/** Serve and emit analytics CLI artifacts from `_generated/` at `/…/data/*.json`. */
export function analyticsDataPlugin(
  files: string[],
  options: { generatedDir?: string } = {},
): Plugin {
  const generatedDir = options.generatedDir ?? defaultGeneratedDir;
  let projectRoot = process.cwd();
  let outDir = "dist";

  return {
    name: "pps-analytics-data",
    configResolved(config) {
      projectRoot = config.root;
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        const match = pathname.match(/\/data\/([^/]+\.json)$/);
        if (!match || !files.includes(match[1])) {
          next();
          return;
        }

        const source = join(generatedDir, match[1]);
        if (!existsSync(source)) {
          res.statusCode = 404;
          res.end(`Missing generated artifact ${match[1]}. Run pnpm build:content.`);
          return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        createReadStream(source).pipe(res);
      });
    },
    closeBundle() {
      if (!existsSync(generatedDir)) {
        console.warn(`Skipping analytics data emit: ${generatedDir} not found.`);
        return;
      }

      const outDataDir = join(projectRoot, outDir, "data");
      mkdirSync(outDataDir, { recursive: true });

      for (const file of files) {
        const source = join(generatedDir, file);
        if (!existsSync(source)) {
          console.warn(`Skipping missing generated artifact: ${source}`);
          continue;
        }
        cpSync(source, join(outDataDir, file));
      }
    },
  };
}
