import ppsShell from "@pps/shell/astro";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { siteRebuildDevPlugin } from "@pps/analytics-cli/vite/rebuild-dev";
import { siteRoadmapLayoutDevPlugin } from "@pps/content/vite/supabase-dev";
import {
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  subsitesDevPlugins,
  withSharedVitePlugins,
} from "@pps/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = repoRootFromWorkspace(rootDir);
const base = process.env.SITE_BASE ?? "/";
const sharedVite = sharedViteEnv(rootDir);

export default defineConfig({
  integrations: [ppsShell()],
  base,
  outDir: "dist",
  publicDir: "public",
  server: {
    port: 4321,
    strictPort: true,
  },
  vite: {
    ...sharedVite,
    optimizeDeps: {
      ...sharedVite.optimizeDeps,
      include: [
        ...(sharedVite.optimizeDeps?.include ?? []),
        "ts-pattern",
        "js-yaml",
      ],
    },
    plugins: [
      ...withSharedVitePlugins(repoRoot),
      siteRebuildDevPlugin({ repoRoot }),
      siteRoadmapLayoutDevPlugin({ repoRoot }),
      quietEmbeddedDevPlugin({ scope: "site", disableHmr: false }),
      ...subsitesDevPlugins(repoRoot),
    ],
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});
