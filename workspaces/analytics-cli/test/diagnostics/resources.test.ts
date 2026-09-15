import { describe, expect, it } from "vitest";
import { buildGraphFromPages, collectDiagnostics, createLoadedConfig } from "@pps/core";

describe("resource citation diagnostics", () => {
  it("reports citations that do not exist in content/resources.json", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "algoritmos.md",
          content: `---
title: algoritmos
kind: concept
dependsOn: []
---
- definición de algoritmo [@algoritmo]
- recurso inexistente [@missing-resource-id]
`,
        },
      ],
      resources: [
        {
          id: "algoritmo",
          type: "webpage",
          title: "Algoritmo",
          URL: "https://example.com/algoritmo",
          author: [{ literal: "Example" }],
          issued: { raw: "2024" },
        },
      ],
    });

    const diagnostics = collectDiagnostics(graph).filter(
      (item) => item.code === "citation-unresolved",
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "citation-unresolved",
        page: "algoritmos",
        line: 2,
        message:
          'Page "algoritmos" cites resource "missing-resource-id" that is missing from content/resources.json.',
        details: expect.objectContaining({ citationId: "missing-resource-id" }),
      }),
    ]);
  });

  it("checks resource citations on non-concept pages", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "programacion-i.md",
          content: `---
title: programación i
kind: course
---
- material de apoyo [@unknown-course-resource]
`,
        },
      ],
      resources: [],
    });

    const diagnostics = collectDiagnostics(graph);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "citation-unresolved",
        page: "programación i",
        line: 1,
      }),
    );
  });
});
