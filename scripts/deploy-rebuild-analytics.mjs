#!/usr/bin/env node
/**
 * Deploy rebuild-analytics Edge Function (reads SUPABASE_ACCESS_TOKEN from .env).
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

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  process.stderr.write("Missing SUPABASE_ACCESS_TOKEN in .env\n");
  process.exit(1);
}

const ref =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  process.env.PUBLIC_SUPABASE_PROJECT_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!ref) {
  process.stderr.write("Could not infer project ref from PUBLIC_SUPABASE_PROJECT_URL\n");
  process.exit(1);
}

const args = [
  "--yes",
  "supabase@2",
  "functions",
  "deploy",
  "rebuild-analytics",
  "--project-ref",
  ref,
  "--use-api",
];

const result = spawnSync("npx", args, {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
