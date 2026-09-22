import { describe, expect, it } from "vitest";

import {
  degreeSlugForCourseInSources,
  roadmapCourseSubgraphHref,
} from "../../../cms/src/roadmap-course-link";

describe("degreeSlugForCourseInSources", () => {
  it("resolves the degree from a year page that lists the course", () => {
    const sources = [
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
    ];

    const courses = [{ slug: "programacion-i", title: "programación i" }];
    expect(degreeSlugForCourseInSources(sources, "programacion-i", courses)).toBe("lds");
  });

  it("matches year grids that store course titles instead of slugs", () => {
    const sources = [
      {
        path: "lds-ano-1.md",
        content: `---
title: LDS · año 1
kind: year
degree: LDS
yearIndex: 1
courses:
  - programación i
---
`,
      },
    ];
    const courses = [{ slug: "programacion-i", title: "programación i" }];
    expect(
      degreeSlugForCourseInSources(sources, "programacion-i", courses, "programación i"),
    ).toBe("lds");
  });
});

describe("roadmapCourseSubgraphHref", () => {
  it("builds the roadmap concept map URL", () => {
    expect(roadmapCourseSubgraphHref("/", "lds", "programacion-i")).toBe(
      "/roadmap/?degree=lds&course=programacion-i",
    );
  });
});
