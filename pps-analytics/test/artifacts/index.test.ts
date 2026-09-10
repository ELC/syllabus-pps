import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildStaticDashboards, renderSummary, writeOutputs } from "../../src/artifacts";
import { parseGeneratedHeaderLine, parseGeneratedJsonFile, stableJson } from "../../src/generated";
import { collectDiagnostics } from "../../src/diagnostics/index";
import { buildFixtureGraph, summarizeDiagnostics } from "../support/fixtures";
import { CurriculumGraph, Diagnostic } from "../../src/types";

describe("stableJson", () => {
  it("pretty-prints JSON values", () => {
    const value = { pages: 1, nested: { kind: "concept" } };
    const json = stableJson(value);

    expect(json).toBe('{\n  "pages": 1,\n  "nested": {\n    "kind": "concept"\n  }\n}');
  });
});

describe("renderSummary", () => {
  it("includes graph counts and diagnostic findings", () => {
    const graph = buildFixtureGraph();
    const diagnostics = collectDiagnostics(graph);
    const summary = renderSummary(graph, diagnostics);

    expect(summary).toContain("# PPS Zettelkasten Analytics Summary");
    expect(summary).toContain("## Graph");
    expect(summary).toContain("## Diagnostics");
    expect(summary).toContain("uuid-ref-resolved");
  });
});

describe("buildStaticDashboards", () => {
  it("exports the same five dashboards as DAC", () => {
    const graph = buildFixtureGraph();
    const diagnostics = collectDiagnostics(graph);
    const exported = buildStaticDashboards(graph, diagnostics);

    expect(exported.dashboards.map((dashboard) => dashboard.name)).toEqual([
      "Quality",
      "Concept Coverage",
      "Curriculum Map",
      "Source Coverage",
      "Concept Map",
    ]);
    expect(exported.dashboards[0]?.tables[0]?.rows.length).toBe(diagnostics.length);
  });
});

describe("writeOutputs", () => {
  it("writes graph, diagnostics, dashboards, and summary files", () => {
    const outDir = mkdtempSync(join(tmpdir(), "pps-analytics-output-"));
    const graph = buildFixtureGraph();
    const diagnostics = collectDiagnostics(graph);

    try {
      const paths = writeOutputs({ outDir, graph, diagnostics });

      const graphFile = parseGeneratedJsonFile<CurriculumGraph>(
        readFileSync(paths.curriculumGraphPath, "utf8"),
      );
      const diagnosticsFile = parseGeneratedJsonFile<Diagnostic[]>(
        readFileSync(paths.diagnosticsPath, "utf8"),
      );

      expect(graphFile.meta.kind).toBe("curriculum-graph");
      expect(graphFile.payload.pages.length).toBeGreaterThan(0);
      expect(diagnosticsFile.meta.kind).toBe("diagnostics");
      expect(summarizeDiagnostics(diagnosticsFile.payload)).toEqual(
        summarizeDiagnostics(diagnostics),
      );
      expect(parseGeneratedHeaderLine(readFileSync(paths.summaryPath, "utf8")).kind).toBe(
        "summary",
      );
      expect(readFileSync(paths.summaryPath, "utf8")).toContain("## Findings");
      expect(
        parseGeneratedJsonFile(readFileSync(paths.cytoscapeGraphPath, "utf8")).meta.kind,
      ).toBe("graph-cy");
      expect(parseGeneratedJsonFile(readFileSync(paths.dashboardsPath, "utf8")).meta.kind).toBe(
        "dashboards",
      );
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
