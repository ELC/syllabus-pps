import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rebuildDevPlugin } from "@pps/analytics-cli/vite/rebuild-dev";
import {
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  withSharedVitePlugins,
} from "@pps/config";
import { supabaseDevPlugin } from "@pps/content/vite/supabase-dev";
import { shellHeadPlugin, shellLogoPostPlugin } from "@pps/shell/vite";

const workspaceDir = resolve(import.meta.dirname);
const repoRoot = repoRootFromWorkspace(workspaceDir);
const base = process.env.ROADMAP_BASE ?? "/roadmap/";

export default defineConfig({
  base,
  ...sharedViteEnv(workspaceDir),
  plugins: [
    ...withSharedVitePlugins(repoRoot),
    quietEmbeddedDevPlugin(),
    react(),
    shellHeadPlugin("ROADMAP_BASE", "/roadmap/", { activeNav: "roadmap", prerenderShell: true }),
    shellLogoPostPlugin(),
    rebuildDevPlugin({ repoRoot }),
    supabaseDevPlugin({ repoRoot, roadmapLayouts: true }),
  ],
  server: {
    hmr: false,
    fs: {
      allow: ["../.."],
    },
  },
  ssr: {
    noExternal: ["@pps/content", "@pps/content/browser", "@pps/core", "@pps/shell"],
  },
});
