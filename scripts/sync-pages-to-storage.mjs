#!/usr/bin/env node
/**
 * Upload repo content/pages/*.md to Supabase Storage and remove stale page objects.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = resolve(repoRoot, "content/pages");

const { createServerClientFromEnv, listPages, pageObjectPath, readStorageBucketFromEnv, writePage } =
  await import(join(repoRoot, "workspaces/content/dist/index.js"));

const client = createServerClientFromEnv();
const bucket = readStorageBucketFromEnv();

const entries = (await readdir(pagesDir)).filter((name) => name.endsWith(".md"));
const localSlugs = new Set(entries.map((name) => name.replace(/\.md$/i, "")));

for (const name of entries) {
  const slug = name.replace(/\.md$/i, "");
  const content = await readFile(join(pagesDir, name), "utf8");
  await writePage(client, bucket, slug, content);
  process.stdout.write(`uploaded ${slug}\n`);
}

const remote = await listPages(client, bucket);
const remoteSlugs = new Set(remote.map((page) => page.slug));

for (let yearIndex = 1; yearIndex <= 10; yearIndex += 1) {
  const legacySlug = `ano-${yearIndex}`;
  const modernSlug = `lds-ano-${yearIndex}`;
  if (localSlugs.has(modernSlug) && remoteSlugs.has(legacySlug)) {
    const { error } = await client.storage.from(bucket).remove([pageObjectPath(legacySlug)]);
    if (error) {
      throw error;
    }
    process.stdout.write(`removed legacy ${legacySlug}\n`);
    remoteSlugs.delete(legacySlug);
  }
}

for (const slug of remoteSlugs) {
  if (localSlugs.has(slug)) {
    continue;
  }
  const { error } = await client.storage.from(bucket).remove([pageObjectPath(slug)]);
  if (error) {
    throw error;
  }
  process.stdout.write(`removed orphan ${slug}\n`);
}

process.stdout.write(`Synced ${localSlugs.size} page(s) to bucket "${bucket}".\n`);
