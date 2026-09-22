#!/usr/bin/env node
/**
 * Bundle rebuild-remote (monorepo TS) for Supabase Edge deploy (Deno cannot resolve @pps/*).
 */
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(repoRoot, "supabase/functions/rebuild-analytics/rebuild-lib.js");

const processShim = `
const process = globalThis.process ?? {
  env: new Proxy(
    {},
    {
      get(_, key) {
        if (typeof key !== "string") return undefined;
        if (typeof Deno !== "undefined") return Deno.env.get(key);
        return undefined;
      },
    },
  ),
};
globalThis.process = process;
`;

await build({
  entryPoints: [resolve(repoRoot, "workspaces/analytics-cli/src/pipeline/rebuild-remote.ts")],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: outFile,
  target: "es2022",
  logLevel: "info",
  banner: { js: processShim },
  mainFields: ["module", "main"],
  alias: {
    "@pps/core": resolve(repoRoot, "workspaces/core/src/index.ts"),
    "@pps/content": resolve(repoRoot, "workspaces/content/src/index.ts"),
  },
  loader: { ".ts": "ts", ".json": "json" },
});

process.stdout.write(`Wrote ${outFile}\n`);
