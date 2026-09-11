import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const generatedDir = join(root, "workspaces/analytics-cli/_generated");
const analyticsDataDir = join(root, "workspaces/analytics/public/data");
const networkDataDir = join(root, "workspaces/network/public/data");
const roadmapDataDir = join(root, "workspaces/roadmap/public/data");

mkdirSync(analyticsDataDir, { recursive: true });
mkdirSync(networkDataDir, { recursive: true });
mkdirSync(roadmapDataDir, { recursive: true });

for (const file of ["dashboards.json"]) {
  const source = join(generatedDir, file);
  if (!existsSync(source)) {
    console.warn(`Skipping missing analytics artifact: ${source}`);
    continue;
  }
  cpSync(source, join(analyticsDataDir, file));
}

for (const file of ["graph.cy.json", "curriculum-graph.json"]) {
  const source = join(generatedDir, file);
  if (!existsSync(source)) {
    console.warn(`Skipping missing network artifact: ${source}`);
    continue;
  }
  cpSync(source, join(networkDataDir, file));
}

const roadmapGraph = join(generatedDir, "curriculum-graph.json");
if (existsSync(roadmapGraph)) {
  cpSync(roadmapGraph, join(roadmapDataDir, "curriculum-graph.json"));
}

console.log(`Synced analytics artifacts to ${analyticsDataDir}`);
console.log(`Synced network artifacts to ${networkDataDir}`);
console.log(`Synced roadmap data to ${roadmapDataDir}`);
