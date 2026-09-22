#!/usr/bin/env node
/**
 * Apply AuthZ SQL (app_admins + admin write RLS) using SUPABASE_DB_* from .env.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in environment (.env)`);
  }
  return value;
}

function createClient(port) {
  return new pg.Client({
    host: readEnv("SUPABASE_DB_HOST"),
    port,
    database: process.env.SUPABASE_DB_NAME?.trim() || "postgres",
    user: readEnv("SUPABASE_DB_USER"),
    password: readEnv("SUPABASE_DB_PASSWORD"),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
  });
}

async function connectForMigrations() {
  const configured = Number(process.env.SUPABASE_DB_PORT ?? "5432");
  const ports = configured === 5432 ? [5432] : [configured, 5432];
  let lastError;

  for (const port of ports) {
    const client = createClient(port);
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
    }
  }

  throw lastError;
}

const files = [
  "workspaces/login/sql/003_app_admins.sql",
  "workspaces/content/sql/008_admin_write_rls.sql",
];

async function main() {
  const client = await connectForMigrations();
  try {
    for (const relative of files) {
      const path = resolve(repoRoot, relative);
      const sql = readFileSync(path, "utf8");
      process.stdout.write(`Applying ${relative}…\n`);
      await client.query(sql);
    }
    process.stdout.write("Auth SQL migrations applied.\n");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
