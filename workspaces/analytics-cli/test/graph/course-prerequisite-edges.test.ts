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
          path: "lds-ano-1.md",
          content: `---
title: LDS · año 1
kind: year
degree: LDS
yearIndex: 1
courses:
  - base
  - next
courseCorrelativas:
  next:
    - programación i
---
`,
        },
        {
          path: "next.md",
          content: `---
title: introducción a devops
slug: next
kind: course
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
