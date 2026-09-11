import { describe, expect, it } from "vitest";
import { exportToCytoscape } from "@pps/core";
import { buildFixtureGraph } from "../support/fixtures";

function uniqueEdgeCount(graph: ReturnType<typeof buildFixtureGraph>): number {
  return new Set(graph.edges.map((edge) => `${edge.source}::${edge.target}::${edge.kind}`)).size;
}

describe("exportToCytoscape", () => {
  it("exports nodes and deduplicated edges for the fixture graph", () => {
    const graph = buildFixtureGraph();
    const exported = exportToCytoscape(graph);

    expect(exported.elements.nodes.length).toBe(graph.pages.length);
    expect(graph.edges.length).toBeGreaterThan(uniqueEdgeCount(graph));
    expect(exported.elements.edges.length).toBe(uniqueEdgeCount(graph));
    expect(exported.elements.nodes[0]?.data.slug).toBeTruthy();
  });

  it("omits edges whose source or target is not a known page", () => {
    const graph = buildFixtureGraph();
    graph.edges.push({
      source: "programación i",
      target: "nonexistent course",
      kind: "page-ref",
      rawTarget: "nonexistent course",
      line: 1,
    });

    const exported = exportToCytoscape(graph);

    expect(exported.elements.edges.some((edge) => edge.data.target === "nonexistent course")).toBe(
      false,
    );
  });
});
