#!/usr/bin/env node
/**
 * POST rebuild-analytics deploy payload to Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN (or pass via --env-file=.env).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath =
  process.argv[2] ??
  resolve(repoRoot, "supabase/functions/rebuild-analytics/_deploy-for-mcp.json");

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens). Add to .env or run with env var set.",
  );
  process.exit(1);
}

const ref =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  process.env.PUBLIC_SUPABASE_PROJECT_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!ref) {
  console.error("Could not infer project ref from PUBLIC_SUPABASE_PROJECT_URL");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
const body = {
  metadata: {
    name: payload.name ?? "rebuild-analytics",
    entrypoint_path: payload.entrypoint_path ?? "index.ts",
    verify_jwt: payload.verify_jwt ?? false,
  },
  files: payload.files,
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
