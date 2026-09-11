import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const shellCssSource = join(root, "workspaces/shell/dist/pps-shell.css");
const shellLogoSource = join(root, "workspaces/shell/assets/logo-horizontal-blanco.png");
const shellCssDest = join(root, "dist/assets/shell/pps-shell.css");
const shellLogoDest = join(root, "dist/assets/shell/logo-horizontal-blanco.png");

spawnSync(process.execPath, [join(root, "workspaces/shell/scripts/build-css.mjs")], {
  stdio: "inherit",
});
const siteDist = join(root, "workspaces/site/dist");
const analyticsDist = join(root, "workspaces/analytics/dist");
const networkDist = join(root, "workspaces/network/dist");
const cmsDist = join(root, "workspaces/cms/dist");
const roadmapDist = join(root, "workspaces/roadmap/dist");
const combinedDist = join(root, "dist");
const generatedDir = join(root, "workspaces/analytics-cli/_generated");

rmSync(combinedDist, { recursive: true, force: true });
mkdirSync(combinedDist, { recursive: true });

if (existsSync(siteDist)) {
  cpSync(siteDist, combinedDist, { recursive: true });
}

if (existsSync(analyticsDist)) {
  mkdirSync(join(combinedDist, "analytics"), { recursive: true });
  cpSync(analyticsDist, join(combinedDist, "analytics"), { recursive: true });
}

if (existsSync(networkDist)) {
  mkdirSync(join(combinedDist, "network"), { recursive: true });
  cpSync(networkDist, join(combinedDist, "network"), { recursive: true });
}

if (existsSync(cmsDist)) {
  mkdirSync(join(combinedDist, "cms"), { recursive: true });
  cpSync(cmsDist, join(combinedDist, "cms"), { recursive: true });
}

if (existsSync(roadmapDist)) {
  mkdirSync(join(combinedDist, "roadmap"), { recursive: true });
  cpSync(roadmapDist, join(combinedDist, "roadmap"), { recursive: true });
}

if (existsSync(shellCssSource)) {
  mkdirSync(dirname(shellCssDest), { recursive: true });
  cpSync(shellCssSource, shellCssDest);
  if (existsSync(shellLogoSource)) {
    cpSync(shellLogoSource, shellLogoDest);
  }
} else {
  console.warn(`Shell CSS missing at ${shellCssSource}`);
}

if (existsSync(generatedDir)) {
  mkdirSync(join(combinedDist, "analytics", "data"), { recursive: true });
  mkdirSync(join(combinedDist, "network", "data"), { recursive: true });

  for (const file of ["dashboards.json"]) {
    const source = join(generatedDir, file);
    if (existsSync(source)) {
      cpSync(source, join(combinedDist, "analytics", "data", file));
    }
  }

  for (const file of ["graph.cy.json", "curriculum-graph.json"]) {
    const source = join(generatedDir, file);
    if (existsSync(source)) {
      cpSync(source, join(combinedDist, "network", "data", file));
    }
  }
}

console.log(`Combined GitHub Pages artifact at ${combinedDist}`);
