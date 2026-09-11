import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@pps/core": resolve(__dirname, "../pps-core/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/index.test.ts"],
  },
});
