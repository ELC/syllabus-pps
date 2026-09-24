import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
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

export default defineConfig({
  base: process.env.PLANNING_BASE ?? "/planning/",
  ...sharedViteEnv(workspaceDir),
  plugins: [
    ...withSharedVitePlugins(repoRoot),
    quietEmbeddedDevPlugin(),
    react(),
    shellHeadPlugin("PLANNING_BASE", "/planning/", {
      activeNav: "planning",
      prerenderShell: true,
    }),
    shellLogoPostPlugin(),
    supabaseDevPlugin({ repoRoot, pages: true, planningPlans: true }),
  ],
  server: {
    hmr: false,
    fs: { allow: ["../.."] },
  },
  ssr: {
    noExternal: ["@pps/content", "@pps/core", "@pps/login", "@pps/shell"],
  },
});
