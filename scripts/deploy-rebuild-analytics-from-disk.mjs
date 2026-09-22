#!/usr/bin/env node
/**
 * Bundle + deploy rebuild-analytics (reads SUPABASE_ACCESS_TOKEN from .env).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(repoRoot, ".env");

function loadDotEnv(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(envPath);

const bundle = spawnSync(process.execPath, [resolve(repoRoot, "scripts/bundle-rebuild-analytics-edge.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (bundle.status !== 0) {
  process.exit(bundle.status ?? 1);
}

const deploy = spawnSync(process.execPath, [resolve(repoRoot, "scripts/deploy-rebuild-analytics.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});
process.exit(deploy.status ?? 1);
