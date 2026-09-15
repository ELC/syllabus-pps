import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const citesDir = fileURLToPath(new URL(".", import.meta.url));
const resourcesPath = resolve(citesDir, "../../content/resources.json");

export function staticResourcesPlugin(): Plugin {
  let outDir = "dist";

  return {
    name: "pps-static-resources",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dataDir = resolve(citesDir, outDir, "data");
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(join(dataDir, "resources.json"), readFileSync(resourcesPath, "utf8"), "utf8");
    },
  };
}
