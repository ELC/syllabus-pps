import {
  createServerClientFromEnv,
  fetchResourceCatalog,
  listPages,
  readStorageBucketFromEnv,
} from "@pps/content";

export async function syncStatus(): Promise<{ pageCount: number; resourceCount: number }> {
  const client = createServerClientFromEnv();
  const bucket = readStorageBucketFromEnv();
  const [pages, resources] = await Promise.all([
    listPages(client, bucket),
    fetchResourceCatalog(client),
  ]);

  return {
    pageCount: pages.length,
    resourceCount: resources.length,
  };
}
