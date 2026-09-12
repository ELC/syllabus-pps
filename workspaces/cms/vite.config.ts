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
import { localContentPlugin } from "./vite.local-content";
import { staticContentPlugin } from "./vite.static-content";

const workspaceDir = resolve(import.meta.dirname);
const repoRoot = repoRootFromWorkspace(workspaceDir);
const base = process.env.CMS_BASE ?? "/cms/";

export default defineConfig({
  base,
  ...sharedViteEnv(repoRoot),
  plugins: [
    ...withSharedVitePlugins(repoRoot),
    quietEmbeddedDevPlugin(),
    react(),
    shellHeadPlugin("CMS_BASE", "/cms/", {
      activeNav: "cms",
      prerenderShell: true,
      sidebarExtraId: "cms-sidebar-extra",
      mainClass: "dashboard-main",
    }),
    shellLogoPostPlugin(),
    localContentPlugin(),
    staticContentPlugin(),
  ],
  server: {
    hmr: false,
    fs: {
      allow: ["../.."],
    },
  },
});
