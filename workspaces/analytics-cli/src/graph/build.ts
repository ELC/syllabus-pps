import { resolve } from "node:path";
import {
  createServerClientFromEnv,
  fetchAllPageSources,
  fetchResourceCatalog,
  readStorageBucketFromEnv,
} from "@pps/content";
import { buildGraphFromPages, LoadedConfig } from "@pps/core";
import { readPageSources } from "../content/read-pages";
import { readResourceCatalog } from "../content/read-resources";
import { CurriculumGraph } from "../types";

export { buildEdges } from "@pps/core";

export function buildGraphFromLocalFiles(input: {
  contentDir: string;
  config: LoadedConfig;
  generatedAt?: string;
}): CurriculumGraph {
  const contentDir = resolve(input.contentDir);
  return buildGraphFromPages({
    sources: readPageSources(contentDir),
    config: input.config,
    generatedAt: input.generatedAt,
    resources: readResourceCatalog(contentDir),
  });
}

export async function buildGraph(input: {
  contentDir: string;
  config: LoadedConfig;
  generatedAt?: string;
  useLocalContent?: boolean;
}): Promise<CurriculumGraph> {
  if (input.useLocalContent) {
    return buildGraphFromLocalFiles(input);
  }

  const client = createServerClientFromEnv();
  const bucket = readStorageBucketFromEnv();
  const [sources, resources] = await Promise.all([
    fetchAllPageSources(client, bucket),
    fetchResourceCatalog(client),
  ]);

  return buildGraphFromPages({
    sources,
    config: input.config,
    generatedAt: input.generatedAt,
    resources,
  });
}
