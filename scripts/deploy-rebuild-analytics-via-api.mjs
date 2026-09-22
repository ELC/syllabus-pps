#!/usr/bin/env node
/**
 * Deploy rebuild-analytics using Supabase Management API (reads SUPABASE_ACCESS_TOKEN from .env).
 * Bundles first, then uploads index.ts + rebuild-lib.js from disk.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(repoRoot, ".env");

function loadDotEnv(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(envPath);

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env (create one at https://supabase.com/dashboard/account/tokens)");
  process.exit(1);
}

const ref =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  process.env.PUBLIC_SUPABASE_PROJECT_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!ref) {
  console.error("Could not infer project ref from PUBLIC_SUPABASE_PROJECT_URL");
  process.exit(1);
}

const bundle = spawnSync(process.execPath, [resolve(repoRoot, "scripts/bundle-rebuild-analytics-edge.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (bundle.status !== 0) process.exit(bundle.status ?? 1);

const fnDir = resolve(repoRoot, "supabase/functions/rebuild-analytics");
const index = readFileSync(resolve(fnDir, "index.ts"), "utf8");
const lib = readFileSync(resolve(fnDir, "rebuild-lib.js"), "utf8");

const body = {
  metadata: {
    name: "rebuild-analytics",
    entrypoint_path: "index.ts",
    verify_jwt: false,
  },
  files: [
    { name: "index.ts", content: index },
    { name: "rebuild-lib.js", content: lib },
  ],
};

const url = `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=rebuild-analytics`;
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Deploy failed (${response.status}):\n${text}`);
  process.exit(1);
}

console.log("rebuild-analytics deployed:");
console.log(text);
