import { describe, expect, it } from "vitest";
import { buildGraphFromPages, collectDiagnostics, createLoadedConfig } from "@pps/core";

describe("concept dependsOn (removed)", () => {
  it("ignores legacy dependsOn frontmatter on concept pages", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "a.md",
          content: `---
title: concepto a
kind: concept
dependsOn:
  - concepto b
---
- nota https://example.com/a
`,
        },
        {
          path: "b.md",
          content: `---
title: concepto b
kind: concept
dependsOn:
  - concepto a
---
- nota https://example.com/b
`,
        },
      ],
    });

    expect(graph.edges.some((edge) => edge.kind === "concept-dependency")).toBe(false);

    const diagnostics = collectDiagnostics(graph);
    expect(diagnostics.some((item) => item.code === "concept-missing-depends-on")).toBe(false);
    expect(diagnostics.some((item) => item.code === "concept-depends-on-cycle")).toBe(false);
  });
});
