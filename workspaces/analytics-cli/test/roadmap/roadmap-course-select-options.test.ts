import { describe, expect, it } from "vitest";
import {
  buildGraphFromPages,
  createLoadedConfig,
  projectCourseRoadmap,
} from "@pps/core";

import { buildRoadmapCourseSelectOptions } from "../../../roadmap/src/components/roadmap/roadmap-course-select-options";

describe("buildRoadmapCourseSelectOptions", () => {
  it("groups courses by año when a carrera is selected", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "lds.md",
          content: `---
title: LDS
kind: degree
slug: lds
---
`,
        },
        {
          path: "lds-ano-1.md",
          content: `---
title: LDS · año 1
slug: lds-ano-1
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
slug: lds-ano-2
kind: year
degree: LDS
yearIndex: 2
courses:
  - bases-de-datos
---
`,
        },
        {
          path: "programacion-i.md",
          content: `---
title: programación i
kind: course
slug: programacion-i
---
`,
        },
        {
          path: "bases-de-datos.md",
          content: `---
title: bases de datos
kind: course
slug: bases-de-datos
---
`,
        },
      ],
    });

    const roadmap = projectCourseRoadmap(graph, "LDS");
    expect(roadmap).not.toBeNull();

    const grouped = buildRoadmapCourseSelectOptions(graph, roadmap, true);
    expect(grouped.map((option) => option.label)).toEqual([
      "Todas",
      "año 1",
      "programación i",
      "año 2",
      "bases de datos",
    ]);
    expect(grouped.find((option) => option.label === "año 1")?.disabled).toBe(true);
    expect(grouped.find((option) => option.value === "programacion-i")?.indent).toBe(true);

    const flat = buildRoadmapCourseSelectOptions(graph, roadmap, false);
    expect(flat.some((option) => option.disabled)).toBe(false);
    expect(flat.filter((option) => option.value)).toHaveLength(2);
  });
});
