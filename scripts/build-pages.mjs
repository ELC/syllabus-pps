import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const siteDist = join(root, "apps/site/dist");
const cmsDist = join(root, "apps/cms/dist");
const combinedDist = join(root, "dist");
const generatedDir = join(root, "pps-analytics/_generated");

rmSync(combinedDist, { recursive: true, force: true });
mkdirSync(combinedDist, { recursive: true });

if (existsSync(siteDist)) {
  cpSync(siteDist, combinedDist, { recursive: true });
}

if (existsSync(cmsDist)) {
  mkdirSync(join(combinedDist, "cms"), { recursive: true });
  cpSync(cmsDist, join(combinedDist, "cms"), { recursive: true });
}

if (existsSync(generatedDir)) {
  mkdirSync(join(combinedDist, "analytics", "data"), { recursive: true });
  for (const file of ["diagnostics.json", "graph.cy.json", "curriculum-graph.json", "dashboards.json"]) {
    const source = join(generatedDir, file);
    if (existsSync(source)) {
      cpSync(source, join(combinedDist, "analytics", "data", file));
    }
  }
}

console.log(`Combined GitHub Pages artifact at ${combinedDist}`);
