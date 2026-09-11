import { parseFrontmatter } from "@pps/core";

export interface SyncPageRecord {
  slug: string;
  path: string;
  content: string;
  version: number;
  updatedAt: string;
}

export interface SyncConflict {
  slug: string;
  local: SyncPageRecord;
  remote: SyncPageRecord;
}

function readSyncMeta(content: string): { version: number; updatedAt: string } {
  const parsed = parseFrontmatter(content);
  const version = typeof parsed.data.version === "number" ? parsed.data.version : 0;
  const updatedAt =
    typeof parsed.data.updatedAt === "string" ? parsed.data.updatedAt : "1970-01-01T00:00:00.000Z";
  return { version, updatedAt };
}

export function toSyncRecord(slug: string, content: string): SyncPageRecord {
  const meta = readSyncMeta(content);
  return {
    slug,
    path: `${slug}.md`,
    content,
    version: meta.version,
    updatedAt: meta.updatedAt,
  };
}

export function mergeRecords(
  local: SyncPageRecord | undefined,
  remote: SyncPageRecord | undefined,
): { winner?: SyncPageRecord; conflict?: SyncConflict } {
  if (!local) {
    return { winner: remote };
  }
  if (!remote) {
    return { winner: local };
  }
  if (local.content === remote.content) {
    return { winner: local };
  }
  if (local.version > remote.version) {
    return { winner: local };
  }
  if (remote.version > local.version) {
    return { winner: remote };
  }
  if (local.updatedAt > remote.updatedAt) {
    return { winner: local };
  }
  if (remote.updatedAt > local.updatedAt) {
    return { winner: remote };
  }

  return { conflict: { slug: local.slug, local, remote } };
}
