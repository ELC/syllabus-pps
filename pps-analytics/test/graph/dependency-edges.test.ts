import { describe, expect, it } from "vitest";
import { buildGraphFromPages, createLoadedConfig } from "@pps/core";

describe("concept dependency edges", () => {
  it("emits prerequisite to dependent edges from frontmatter", () => {
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

    expect(graph.edges).toContainEqual({
      source: "base",
      target: "siguiente",
      kind: "concept-dependency",
      rawTarget: "base",
      line: 0,
    });
  });
});
