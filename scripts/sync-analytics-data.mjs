import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const generatedDir = join(root, "pps-analytics/_generated");
const siteDataDir = join(root, "apps/site/public/analytics/data");
const roadmapDataDir = join(root, "apps/roadmap/public/data");

mkdirSync(siteDataDir, { recursive: true });
mkdirSync(roadmapDataDir, { recursive: true });

for (const file of ["diagnostics.json", "graph.cy.json", "curriculum-graph.json", "dashboards.json"]) {
  const source = join(generatedDir, file);
  if (!existsSync(source)) {
    console.warn(`Skipping missing analytics artifact: ${source}`);
    continue;
  }
  cpSync(source, join(siteDataDir, file));
}

const roadmapGraph = join(generatedDir, "curriculum-graph.json");
if (existsSync(roadmapGraph)) {
  cpSync(roadmapGraph, join(roadmapDataDir, "curriculum-graph.json"));
}

console.log(`Synced analytics artifacts to ${siteDataDir}`);
console.log(`Synced roadmap data to ${roadmapDataDir}`);
