import ppsShell from "@pps/shell/astro";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import {
  analyticsDataPlugin,
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
  server: {
    port: 4323,
    strictPort: true,
  },
  vite: {
    ...sharedViteEnv(repoRoot),
    plugins: [
      ...withSharedVitePlugins(repoRoot),
      quietEmbeddedDevPlugin(),
      analyticsDataPlugin(["dashboards.json"]),
    ],
    server: {
      hmr: false,
      fs: {
        allow: ["../.."],
      },
    },
  },
});
