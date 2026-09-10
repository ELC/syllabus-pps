import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const generatedDir = join(root, "pps-analytics/_generated");
const publicDataDir = join(root, "apps/site/public/analytics/data");

mkdirSync(publicDataDir, { recursive: true });

for (const file of ["diagnostics.json", "graph.cy.json", "curriculum-graph.json", "dashboards.json"]) {
  const source = join(generatedDir, file);
  if (!existsSync(source)) {
    console.warn(`Skipping missing analytics artifact: ${source}`);
    continue;
  }
  cpSync(source, join(publicDataDir, file));
}

console.log(`Synced analytics artifacts to ${publicDataDir}`);
