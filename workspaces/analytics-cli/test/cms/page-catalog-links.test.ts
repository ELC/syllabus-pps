import { describe, expect, it } from "vitest";

import {
  buildEditorCatalogGraph,
  conceptsForCourseInGraph,
  coursesForConceptInGraph,
  yearPagesForCourseInSources,
} from "../../../cms/src/page-catalog-links";

describe("yearPagesForCourseInSources", () => {
  it("lists year pages whose grid includes the course slug", () => {
    const sources = [
      {
        path: "lds.md",
        content: `---
title: LDS
kind: degree
years: 4
---
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
  - programacion-i
---
`,
      },
      {
        path: "lds-ano-2.md",
        content: `---
title: LDS · año 2
kind: year
degree: LDS
yearIndex: 2
coursesNoEstructurado:
  - programacion-i
---
`,
      },
    ];
    const courses = [{ slug: "programacion-i", title: "programación i" }];
    const links = yearPagesForCourseInSources(
      sources,
      "programacion-i",
      "programación i",
      courses,
      new Set(["lds-ano-1", "lds-ano-2"]),
      new Map([
        ["lds-ano-1", "LDS · año 1"],
        ["lds-ano-2", "LDS · año 2"],
      ]),
    );
    expect(links.map((link) => link.slug)).toEqual(["lds-ano-1", "lds-ano-2"]);
    expect(links.map((link) => link.label)).toEqual(["LDS · año 1", "LDS · año 2"]);
  });
});

describe("conceptsForCourseInGraph", () => {
  it("finds concepts hashtagged on the course page", () => {
    const sources = [
      {
        path: "algoritmos.md",
        content: `---
title: algoritmos
kind: concept
---
- definición [@x]
`,
      },
      {
        path: "programacion-i.md",
        content: `---
title: programación i
kind: course
---
- #algoritmos
- #variables
`,
      },
      {
        path: "variables.md",
        content: `---
title: variables
kind: concept
---
- scope [@x]
`,
      },
    ];
    const graph = buildEditorCatalogGraph(sources, []);
    const links = conceptsForCourseInGraph(graph, "programacion-i", "programación i");
    expect(links.map((link) => link.slug).sort()).toEqual(["algoritmos", "variables"]);
  });
});

describe("coursesForConceptInGraph", () => {
  it("finds courses that hashtag the concept", () => {
    const sources = [
      {
        path: "algoritmos.md",
        content: `---
title: algoritmos
kind: concept
---
- definición [@x]
`,
      },
      {
        path: "programacion-i.md",
        content: `---
title: programación i
kind: course
---
- #algoritmos
`,
      },
    ];
    const graph = buildEditorCatalogGraph(sources, []);
    const links = coursesForConceptInGraph(graph, "algoritmos", "algoritmos");
    expect(links).toEqual([{ slug: "programacion-i", title: "programación i" }]);
  });
});
