#!/usr/bin/env node
/**
 * Build deploy payload JSON for rebuild-analytics (index.ts + rebuild-lib.js).
 * Run bundle first. Writes supabase/functions/rebuild-analytics/_deploy-for-mcp.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fnDir = resolve(repoRoot, "supabase/functions/rebuild-analytics");

const bundle = spawnSync(process.execPath, [resolve(repoRoot, "scripts/bundle-rebuild-analytics-edge.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (bundle.status !== 0) process.exit(bundle.status ?? 1);

const payload = {
  name: "rebuild-analytics",
  entrypoint_path: "index.ts",
  verify_jwt: false,
  files: [
    { name: "index.ts", content: readFileSync(resolve(fnDir, "index.ts"), "utf8") },
    { name: "rebuild-lib.js", content: readFileSync(resolve(fnDir, "rebuild-lib.js"), "utf8") },
  ],
};

const outPath = resolve(fnDir, "_deploy-for-mcp.json");
writeFileSync(outPath, JSON.stringify(payload), "utf8");
const libLen = payload.files[1].content.length;
process.stdout.write(`Wrote ${outPath} (rebuild-lib.js ${libLen} chars)\n`);
