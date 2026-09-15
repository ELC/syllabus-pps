import { describe, expect, it } from "vitest";
import { buildGraphFromPages, createLoadedConfig } from "@pps/core";

describe("course prerequisite edges", () => {
  it("emits prerequisite to dependent edges from frontmatter correlativas", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "base.md",
          content: `---
title: programación i
kind: course
---
- #python
`,
        },
        {
          path: "next.md",
          content: `---
title: introducción a devops
kind: course
correlativas:
  - programación i
---
- #devops
`,
        },
      ],
    });

    expect(graph.edges).toContainEqual({
      source: "programación i",
      target: "introducción a devops",
      kind: "course-prerequisite",
      rawTarget: "programación i",
      line: 0,
    });
  });
});
