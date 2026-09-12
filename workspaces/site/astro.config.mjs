import ppsShell from "@pps/shell/astro";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
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
    ...sharedViteEnv(repoRoot),
    plugins: [
      ...withSharedVitePlugins(repoRoot),
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
