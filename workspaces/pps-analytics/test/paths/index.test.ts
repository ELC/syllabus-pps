import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { resolveContentDir, resolveDefaultContentDir } from "../../src/paths";
import { FIXTURE_CONFIG_PATH, FIXTURE_CONTENT_DIR } from "../support/fixtures";

describe("resolveContentDir", () => {
  it("prefers --content over config and environment", () => {
    const cliContent = mkdtempSync(join(tmpdir(), "pps-analytics-cli-content-"));
    writeFileSync(join(cliContent, "sample.md"), "---\ntitle: sample\n---\n");

    try {
      const resolved = resolveContentDir({
        configPath: FIXTURE_CONFIG_PATH,
        cliContentDir: cliContent,
      });

      expect(resolved).toBe(cliContent);
    } finally {
      rmSync(cliContent, { recursive: true, force: true });
    }
  });

  it("loads contentDir from pps.config.ts", () => {
    const resolved = resolveContentDir({ configPath: FIXTURE_CONFIG_PATH });

    expect(resolved).toBe(FIXTURE_CONTENT_DIR);
  });

  it("loads contentDir from PPS_CONTENT_DIR when config has no contentDir", () => {
    const contentRoot = mkdtempSync(join(tmpdir(), "pps-analytics-env-content-"));
    writeFileSync(join(contentRoot, "sample.md"), "---\ntitle: sample\n---\n");
    const previous = process.env.PPS_CONTENT_DIR;
    process.env.PPS_CONTENT_DIR = contentRoot;

    try {
      const resolved = resolveContentDir({
        configPath: join(tmpdir(), "missing-pps.config.ts"),
      });

      expect(resolved).toBe(contentRoot);
    } finally {
      if (previous === undefined) {
        delete process.env.PPS_CONTENT_DIR;
      } else {
        process.env.PPS_CONTENT_DIR = previous;
      }
      rmSync(contentRoot, { recursive: true, force: true });
    }
  });

  it("falls back to repo content/pages by default", () => {
    delete process.env.PPS_CONTENT_DIR;
    const resolved = resolveContentDir({
      configPath: join(tmpdir(), "missing-pps.config.ts"),
    });

    expect(resolved).toBe(resolveDefaultContentDir());
  });
});
