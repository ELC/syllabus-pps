import ppsShell from "@pps/shell/astro";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { rebuildDevPlugin } from "@pps/analytics-cli/vite/rebuild-dev";
import {
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  withSharedVitePlugins,
} from "@pps/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = repoRootFromWorkspace(rootDir);
const base = process.env.ANALYTICS_BASE ?? "/analytics/";

export default defineConfig({
  integrations: [ppsShell()],
  base,
  outDir: "dist",
  publicDir: "public",
  vite: {
    ...sharedViteEnv(rootDir),
    plugins: [
      ...withSharedVitePlugins(repoRoot),
      quietEmbeddedDevPlugin(),
      rebuildDevPlugin({ repoRoot }),
    ],
    server: {
      hmr: false,
      fs: {
        allow: ["../.."],
      },
    },
  },
});
