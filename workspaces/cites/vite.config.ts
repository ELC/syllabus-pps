import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  withSharedVitePlugins,
} from "@pps/config";
import { rebuildDevPlugin } from "@pps/analytics-cli/vite/rebuild-dev";
import { supabaseDevPlugin } from "@pps/content/vite/supabase-dev";
import { shellHeadPlugin, shellLogoPostPlugin } from "@pps/shell/vite";

const workspaceDir = resolve(import.meta.dirname);
const repoRoot = repoRootFromWorkspace(workspaceDir);
const base = process.env.CITES_BASE ?? "/cites/";

export default defineConfig({
  base,
  ...sharedViteEnv(workspaceDir),
  plugins: [
    ...withSharedVitePlugins(repoRoot),
    quietEmbeddedDevPlugin(),
    react(),
    shellHeadPlugin("CITES_BASE", "/cites/", {
      activeNav: "cites",
      prerenderShell: true,
      sidebarExtraId: "cites-sidebar-extra",
      mainClass: "dashboard__main",
    }),
    shellLogoPostPlugin(),
    supabaseDevPlugin({ repoRoot, resources: true }),
    rebuildDevPlugin({ repoRoot }),
  ],
  server: {
    hmr: false,
    fs: {
      allow: ["../.."],
    },
  },
  ssr: {
    noExternal: ["@pps/content", "@pps/content/browser", "@pps/core", "@pps/analytics-cli", "@pps/shell"],
  },
});
