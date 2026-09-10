import { describe, expect, it } from "vitest";
import { collectDiagnostics } from "../../src/diagnostics";
import { buildGraph } from "../../src/graph";
import {
  buildFixtureGraph,
  expectedDiagnosticSummaries,
  expectedEdges,
  expectedPageKinds,
  FIXTURE_CONTENT_DIR,
  fixtureConfig,
  summarizeDiagnostics,
} from "../support/fixtures";

describe("buildGraph", () => {
  it("builds a sorted graph from fixture content", () => {
    const graph = buildFixtureGraph();

    expect(graph.pages.map((page) => page.title)).toEqual([
      "algoritmos",
      "algoritmos y estructuras de datos",
      "año 1",
      "LDS",
      "programación i",
    ]);
  });

  it("classifies fixture page kinds", () => {
    const graph = buildFixtureGraph();
    const kinds = new Map(graph.pages.map((page) => [page.title, page.kind]));

    for (const [title, kind] of expectedPageKinds) {
      expect(kinds.get(title)).toBe(kind);
    }
  });

  it("derives expected edges from fixture content", () => {
    const graph = buildFixtureGraph();
    const edges = graph.edges.map((edge) => [edge.source, edge.target, edge.kind] as const);

    for (const expected of expectedEdges) {
      expect(edges).toContainEqual(expected);
    }
  });

  it("matches fixture diagnostic summaries", () => {
    const graph = buildGraph({
      contentDir: FIXTURE_CONTENT_DIR,
      config: fixtureConfig(),
    });
    const diagnostics = collectDiagnostics(graph);
    const summaries = summarizeDiagnostics(diagnostics);

    for (const expected of expectedDiagnosticSummaries) {
      expect(summaries).toContainEqual(expected);
    }
  });
});
