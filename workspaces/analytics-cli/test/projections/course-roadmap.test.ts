import { describe, expect, it } from "vitest";
import {
  buildGraphFromPages,
  courseRoadmapAsDegreeRoadmap,
  createLoadedConfig,
  projectCourseConceptRoadmap,
  projectCourseRoadmap,
} from "@pps/core";

describe("projectCourseRoadmap", () => {
  it("projects reachable courses with correlativas and linked concepts", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "lds.md",
          content: `---
title: LDS
kind: degree
---
- [[año 1]]
`,
        },
        {
          path: "ano-1.md",
          content: `---
title: año 1
kind: year
---
- [[programación i]]
- [[introducción a devops]]
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
        {
          path: "devops.md",
          content: `---
title: introducción a devops
kind: course
correlativas:
  - programación i
---
- #contenedores
`,
        },
        {
          path: "algoritmos.md",
          content: `---
title: algoritmos
kind: concept
dependsOn: []
---
- nota [@algoritmos]
`,
        },
        {
          path: "contenedores.md",
          content: `---
title: contenedores
kind: concept
dependsOn: []
---
- nota [@contenedores]
`,
        },
      ],
      resources: [],
    });

    const roadmap = projectCourseRoadmap(graph, "LDS");
    expect(roadmap).not.toBeNull();
    expect(roadmap?.courses.map((course) => course.title)).toEqual([
      "introducción a devops",
      "programación i",
    ]);
    expect(
      roadmap?.courses.find((course) => course.title === "introducción a devops")?.correlativas,
    ).toEqual(["programación i"]);
    expect(roadmap?.edges).toContainEqual({
      source: "programación i",
      target: "introducción a devops",
      kind: "course-prerequisite",
      rawTarget: "programación i",
      line: 0,
    });

    const asDegree = courseRoadmapAsDegreeRoadmap(roadmap!);
    expect(
      asDegree.concepts.find((course) => course.title === "introducción a devops")?.dependsOn,
    ).toEqual(["programación i"]);
  });

  it("projects concept sub-roadmaps scoped to a course", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "lds.md",
          content: `---
title: LDS
kind: degree
---
- [[programación i]]
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
        {
          path: "algoritmos.md",
          content: `---
title: algoritmos
kind: concept
dependsOn: []
---
- nota [@algoritmos]
`,
        },
      ],
      resources: [],
    });

    const subRoadmap = projectCourseConceptRoadmap(graph, "LDS", "programación i");
    expect(subRoadmap?.concepts.map((concept) => concept.title)).toEqual(["algoritmos"]);
  });

  it("includes courses listed only on coursesNoEstructurado for the degree", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
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
          path: "lds-ano-4.md",
          content: `---
title: LDS · año 4
slug: lds-ano-4
kind: year
degree: LDS
yearIndex: 4
coursesNoEstructurado:
  - computer-vision
  - redes-y-sistemas-operativos
---
`,
        },
        {
          path: "computer-vision.md",
          content: `---
title: computer vision
kind: course
---
- visión
`,
        },
        {
          path: "redes-y-sistemas-operativos.md",
          content: `---
title: redes y sistemas operativos
kind: course
---
- redes
`,
        },
      ],
      resources: [],
    });

    const roadmap = projectCourseRoadmap(graph, "LDS");
    expect(roadmap?.courses.map((course) => course.title).sort()).toEqual([
      "computer vision",
      "redes y sistemas operativos",
    ]);
  });

  it("projects trayecto metadata for unstructured-track courses", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "lds.md",
          content: `---
title: LDS
kind: degree
years: 1
---
- [[computer vision]]
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
coursesNoEstructurado:
  - computer-vision
---
`,
        },
        {
          path: "computer-vision.md",
          content: `---
title: computer vision
kind: course
---
- visión por computadora
`,
        },
      ],
      resources: [],
    });

    const roadmap = projectCourseRoadmap(graph, "LDS");
    expect(roadmap?.courses).toEqual([
      expect.objectContaining({
        title: "computer vision",
        trayecto: "Trayecto No Estructurado",
      }),
    ]);
  });
});
