import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { quietEmbeddedDevPlugin, repoRootFromWorkspace, sharedViteEnv, withSharedVitePlugins } from "@pps/config";
import { shellHeadPlugin, shellLogoPostPlugin } from "@pps/shell/vite";

const workspaceDir = resolve(import.meta.dirname);
const repoRoot = repoRootFromWorkspace(workspaceDir);
const base = process.env.USERS_BASE ?? "/users/";

export default defineConfig({
  base,
  ...sharedViteEnv(workspaceDir),
  plugins: [
    ...withSharedVitePlugins(repoRoot),
    quietEmbeddedDevPlugin(),
    react(),
    shellHeadPlugin("USERS_BASE", "/users/", {
      activeNav: "users",
      prerenderShell: true,
      mainClass: "dashboard__main",
    }),
    shellLogoPostPlugin(),
  ],
  server: {
    hmr: false,
    fs: {
      allow: ["../.."],
    },
  },
  ssr: {
    noExternal: ["@pps/login", "@pps/shell"],
  },
});
