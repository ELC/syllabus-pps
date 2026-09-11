import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const buildCssScript = join(root, "workspaces/shell/scripts/build-css.mjs");
const shellCss = join(root, "workspaces/shell/dist/pps-shell.css");
const shellLogo = join(root, "workspaces/shell/assets/logo-horizontal-blanco.png");
const relativeDest = join("assets", "shell", "pps-shell.css");
const logoDest = join("assets", "shell", "logo-horizontal-blanco.png");

const publicRoots = [
  join(root, "workspaces/site/public"),
  join(root, "workspaces/analytics/public"),
  join(root, "workspaces/network/public"),
  join(root, "workspaces/cms/public"),
  join(root, "workspaces/roadmap/public"),
];

if (!existsSync(shellCss)) {
  spawnSync(process.execPath, [buildCssScript], { stdio: "inherit" });
}
if (!existsSync(shellCss)) {
  throw new Error(`Shell CSS missing at ${shellCss}`);
}

for (const publicRoot of publicRoots) {
  const dest = join(publicRoot, relativeDest);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(shellCss, dest);
  if (existsSync(shellLogo)) {
    cpSync(shellLogo, join(publicRoot, logoDest));
  }
}

console.log(`Synced shell CSS to ${publicRoots.length} app public/ folders`);
