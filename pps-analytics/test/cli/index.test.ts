import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { main } from "../../src/cli/index";
import { GENERATED_DIRECTORY, parseGeneratedJsonFile } from "../../src/generated";
import { FIXTURE_CONFIG_PATH, FIXTURE_CONTENT_DIR } from "../support/fixtures";
import { CurriculumGraph } from "../../src/types";

function captureStdout(run: () => Promise<number>): Promise<{ exitCode: number; output: string }> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;

  return run()
    .then((exitCode) => ({ exitCode, output: chunks.join("") }))
    .finally(() => {
      process.stdout.write = originalWrite;
    });
}

describe("main", () => {
  it("inspect prints a summary for the fixture content", async () => {
    const args = ["inspect", "--content", FIXTURE_CONTENT_DIR, "--config", FIXTURE_CONFIG_PATH];
    const { exitCode, output } = await captureStdout(() => main(args));

    expect(exitCode).toBe(0);
    expect(output).toContain("# PPS Zettelkasten Analytics Summary");
    expect(output).toContain("uuid-ref-resolved");
  });

  it("build writes analytics outputs to the requested directory", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "pps-analytics-cli-"));
    const args = [
      "build",
      "--content",
      FIXTURE_CONTENT_DIR,
      "--config",
      FIXTURE_CONFIG_PATH,
      "--out",
      outDir,
    ];

    try {
      const exitCode = await main(args);

      expect(exitCode).toBe(0);
      expect(
        parseGeneratedJsonFile<CurriculumGraph>(
          readFileSync(join(outDir, GENERATED_DIRECTORY, "curriculum-graph.json"), "utf8"),
        ).payload.pages.length,
      ).toBeGreaterThan(0);
      expect(readFileSync(join(outDir, GENERATED_DIRECTORY, "summary.md"), "utf8")).toContain(
        "## Graph",
      );
      expect(
        existsSync(join(outDir, GENERATED_DIRECTORY, "dac/dashboards/quality.dashboard.tsx")),
      ).toBe(true);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
