import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { collectDiagnostics } from "../../src/diagnostics/index";
import { writeDacProject } from "../../src/dac/index";
import { parseGeneratedHeaderLine, parseGeneratedJsonFile } from "../../src/generated";
import { buildFixtureGraph } from "../support/fixtures";
import { CurriculumGraph, Diagnostic } from "../../src/types";

describe("writeDacProject", () => {
  it("generates DAC dashboards and data files from analytics inputs", () => {
    // Arrange
    const outDir = mkdtempSync(join(tmpdir(), "pps-analytics-dac-"));
    const graph = buildFixtureGraph();
    const diagnostics = collectDiagnostics(graph);

    try {
      // Act
      const dacDir = writeDacProject({ outDir, graph, diagnostics });

      // Assert
      expect(existsSync(join(dacDir, ".bruin.yml"))).toBe(true);
      expect(parseGeneratedJsonFile<CurriculumGraph>(
        readFileSync(join(dacDir, "data/curriculum-graph.json"), "utf8"),
      ).meta.kind).toBe("curriculum-graph");
      expect(parseGeneratedJsonFile<Diagnostic[]>(
        readFileSync(join(dacDir, "data/diagnostics.json"), "utf8"),
      ).meta.docs).toBe("../../README.md#dac-dashboard");
      const qualityDashboard = readFileSync(
        join(dacDir, "dashboards/quality.dashboard.tsx"),
        "utf8",
      ).replace(/^\/\/ /, "");
      expect(parseGeneratedHeaderLine(qualityDashboard).kind).toBe("dashboard");
      expect(qualityDashboard).not.toContain('import "./dac"');
      expect(qualityDashboard).toContain('include("queries/quality/pages.sql")');
      expect(existsSync(join(dacDir, "dashboards/queries/quality/pages.sql"))).toBe(true);
      expect(existsSync(join(dacDir, "dashboards/generated/quality-filters.json"))).toBe(true);
      expect(parseGeneratedHeaderLine(
        readFileSync(join(dacDir, ".bruin.yml"), "utf8").replace(/^# /, ""),
      ).kind).toBe("bruin-config");
      expect(parseGeneratedHeaderLine(readFileSync(join(dacDir, "README.md"), "utf8")).kind).toBe(
        "readme",
      );
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
