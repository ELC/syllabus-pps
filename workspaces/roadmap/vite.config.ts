import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  analyticsDataPlugin,
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  withSharedVitePlugins,
} from "@pps/config";
import { shellHeadPlugin, shellLogoPostPlugin } from "@pps/shell/vite";

const workspaceDir = resolve(import.meta.dirname);
const repoRoot = repoRootFromWorkspace(workspaceDir);
const base = process.env.ROADMAP_BASE ?? "/roadmap/";

export default defineConfig({
  base,
  ...sharedViteEnv(repoRoot),
  plugins: [
    ...withSharedVitePlugins(repoRoot),
    quietEmbeddedDevPlugin(),
    react(),
    shellHeadPlugin("ROADMAP_BASE", "/roadmap/", { activeNav: "roadmap", prerenderShell: true }),
    shellLogoPostPlugin(),
    analyticsDataPlugin(["curriculum-graph.json"]),
  ],
  server: {
    hmr: false,
    fs: {
      allow: ["../.."],
    },
  },
});
