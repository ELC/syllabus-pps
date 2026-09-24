import { describe, expect, it } from "vitest";
import { buildGraphFromPages, createLoadedConfig } from "@pps/core";

describe("concept dependency edges", () => {
  it("does not emit edges from concept dependsOn frontmatter", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "base.md",
          content: `---
title: base
kind: concept
dependsOn: []
---
- nota https://example.com/base
`,
        },
        {
          path: "next.md",
          content: `---
title: siguiente
kind: concept
dependsOn:
  - base
---
- nota https://example.com/next
`,
        },
      ],
    });

    expect(graph.edges.filter((edge) => edge.kind === "concept-dependency")).toEqual([]);
  });
});
