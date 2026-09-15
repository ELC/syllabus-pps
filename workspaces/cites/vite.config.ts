import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  quietEmbeddedDevPlugin,
  repoRootFromWorkspace,
  sharedViteEnv,
  withSharedVitePlugins,
} from "@pps/config";
import { shellHeadPlugin, shellLogoPostPlugin } from "@pps/shell/vite";
import { localResourcesPlugin } from "./vite.local-resources";
import { staticResourcesPlugin } from "./vite.static-resources";

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
    localResourcesPlugin(),
    staticResourcesPlugin(),
  ],
  server: {
    hmr: false,
    fs: {
      allow: ["../.."],
    },
  },
});
