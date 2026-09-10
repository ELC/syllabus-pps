import { resolve } from "node:path";
import { buildGraphFromPages, LoadedConfig } from "@pps/core";
import { readPageSources } from "../content/read-pages";
import { CurriculumGraph } from "../types";

export { buildEdges } from "@pps/core";

export function buildGraph(input: {
  contentDir: string;
  config: LoadedConfig;
  generatedAt?: string;
}): CurriculumGraph {
  const contentDir = resolve(input.contentDir);
  return buildGraphFromPages({
    sources: readPageSources(contentDir),
    config: input.config,
    generatedAt: input.generatedAt,
  });
}
