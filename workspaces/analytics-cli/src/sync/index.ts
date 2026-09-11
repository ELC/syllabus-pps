import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { slugFromPath } from "@pps/core";
import { mergeRecords, SyncConflict, toSyncRecord } from "./merge";
import { createSupabaseClientFromEnv, listRemotePages, uploadRemotePage } from "./supabase-storage";

function readLocalPages(contentDir: string) {
  return readdirSync(contentDir)
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => {
      const path = join(contentDir, entry);
      if (!statSync(path).isFile()) {
        return undefined;
      }
      const content = readFileSync(path, "utf8");
      return toSyncRecord(slugFromPath(entry), content);
    })
    .filter((record): record is NonNullable<typeof record> => record !== undefined);
}

export function syncStatus(contentDir: string): {
  localCount: number;
  remoteCount?: number;
  conflicts: SyncConflict[];
} {
  const local = readLocalPages(contentDir);
  return { localCount: local.length, conflicts: [] };
}

export async function syncPull(contentDir: string): Promise<{ written: number; conflicts: SyncConflict[] }> {
  const client = createSupabaseClientFromEnv();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "content";
  const remotePages = await listRemotePages(client, bucket);
  const localBySlug = new Map(readLocalPages(contentDir).map((page) => [page.slug, page]));
  const conflicts: SyncConflict[] = [];
  let written = 0;

  for (const remote of remotePages) {
    const slug = slugFromPath(remote.path);
    const local = localBySlug.get(slug);
    const remoteRecord = toSyncRecord(slug, remote.content);
    const merged = mergeRecords(local, remoteRecord);
    if (merged.conflict) {
      conflicts.push(merged.conflict);
      continue;
    }
    if (merged.winner) {
      writeFileSync(join(contentDir, `${slug}.md`), merged.winner.content, "utf8");
      written += 1;
    }
  }

  return { written, conflicts };
}

export async function syncPush(contentDir: string): Promise<{ uploaded: number; conflicts: SyncConflict[] }> {
  const client = createSupabaseClientFromEnv();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "content";
  const remotePages = await listRemotePages(client, bucket);
  const remoteBySlug = new Map(
    remotePages.map((page) => [slugFromPath(page.path), toSyncRecord(slugFromPath(page.path), page.content)]),
  );
  const conflicts: SyncConflict[] = [];
  let uploaded = 0;

  for (const local of readLocalPages(contentDir)) {
    const remote = remoteBySlug.get(local.slug);
    const merged = mergeRecords(local, remote);
    if (merged.conflict) {
      conflicts.push(merged.conflict);
      continue;
    }
    if (merged.winner?.content) {
      await uploadRemotePage(client, bucket, local.slug, merged.winner.content);
      uploaded += 1;
    }
  }

  return { uploaded, conflicts };
}
