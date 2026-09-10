import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localContentPlugin } from "./vite.local-content";

const base = process.env.CMS_BASE ?? "/cms/";

export default defineConfig({
  base,
  plugins: [react(), localContentPlugin()],
  resolve: {
    alias: {
      "@pps/core": resolve(__dirname, "../../packages/pps-core/src/index.ts"),
    },
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});
