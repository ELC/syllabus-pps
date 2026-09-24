import ppsShell from "@pps/shell/astro";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@vitejs/plugin-react";
import { rebuildDevPlugin } from "@pps/analytics-cli/vite/rebuild-dev";
import { supabaseDevPlugin } from "@pps/content/vite/supabase-dev";
import {
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  withSharedVitePlugins,
} from "@pps/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = repoRootFromWorkspace(rootDir);
const base = process.env.NETWORK_BASE ?? "/network/";

export default defineConfig({
  integrations: [ppsShell()],
  base,
  outDir: "dist",
  publicDir: "public",
  vite: {
    ...sharedViteEnv(rootDir),
    plugins: [
      ...withSharedVitePlugins(repoRoot),
      react(),
      supabaseDevPlugin({ repoRoot, pages: true }),
      quietEmbeddedDevPlugin(),
      rebuildDevPlugin({ repoRoot }),
    ],
    server: {
      hmr: false,
      fs: {
        allow: ["../.."],
      },
    },
    ssr: {
      noExternal: ["@pps/content", "@pps/core", "@pps/login", "@pps/shell"],
    },
  },
});
