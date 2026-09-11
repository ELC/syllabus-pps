import { describe, expect, it } from "vitest";
import { buildGraphFromPages, collectDiagnostics, createLoadedConfig } from "@pps/core";

describe("concept dependsOn diagnostics", () => {
  it("reports missing dependsOn on concept pages", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "concepto.md",
          content: `---
title: concepto
kind: concept
---
- nota https://example.com
`,
        },
      ],
    });

    const diagnostics = collectDiagnostics(graph);
    expect(diagnostics.some((item) => item.code === "concept-missing-depends-on")).toBe(true);
  });

  it("reports unresolved and cyclic dependencies", () => {
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

    const diagnostics = collectDiagnostics(graph);
    expect(diagnostics.some((item) => item.code === "concept-depends-on-cycle")).toBe(true);
  });
});
