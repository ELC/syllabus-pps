import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const cmsDir = fileURLToPath(new URL(".", import.meta.url));
const contentDir = resolve(cmsDir, "../../content/pages");

export function staticContentPlugin(): Plugin {
  let outDir = "dist";

  return {
    name: "pps-static-content",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dataDir = resolve(cmsDir, outDir, "data");
      const pageDir = join(dataDir, "page");
      mkdirSync(pageDir, { recursive: true });

      const entries = readdirSync(contentDir).filter((entry) => entry.endsWith(".md"));
      const pages = entries.map((entry) => ({
        slug: entry.replace(/\.md$/i, ""),
        path: entry,
      }));

      writeFileSync(join(dataDir, "pages.json"), JSON.stringify(pages));

      for (const entry of entries) {
        const slug = entry.replace(/\.md$/i, "");
        writeFileSync(
          join(pageDir, `${slug}.md`),
          readFileSync(join(contentDir, entry), "utf8"),
          "utf8",
        );
      }
    },
  };
}
