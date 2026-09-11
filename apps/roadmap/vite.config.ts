import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.ROADMAP_BASE ?? "/roadmap/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@pps/core": resolve(__dirname, "../../packages/pps-core/src/index.ts"),
      "@pps/shell": resolve(__dirname, "../../packages/pps-shell/src"),
    },
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});
