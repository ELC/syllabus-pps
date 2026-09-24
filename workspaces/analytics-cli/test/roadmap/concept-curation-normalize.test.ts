import { degreeRoadmap, roadmapCuration } from "@pps/core";
import { describe, expect, it } from "vitest";

import { openRoadmapCurationLinearNormalization } from "../../../roadmap/src/components/roadmap/concept-curation-normalize";

const courseRoadmap = degreeRoadmap({
  degree: "programación i",
  degreeSlug: "programacion-i",
  concepts: [
    { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
    { title: "python", slug: "python", dependsOn: ["algoritmos"] },
    { title: "persistencia", slug: "persistencia", dependsOn: ["python"] },
    {
      title: "programación orientada a objetos",
      slug: "programacion-orientada-a-objetos",
      dependsOn: ["python"],
    },
  ],
  edges: [],
});

function normalize(input: ReturnType<typeof roadmapCuration>) {
  return openRoadmapCurationLinearNormalization(input).forCourse(courseRoadmap);
}

describe("openRoadmapCurationLinearNormalization", () => {
  it("clears spine promotions for titles already on the spine", () => {
    const withPromotions = roadmapCuration({
      degreeSlug: "programacion-i",
      parallelLanes: [
        { root: "algoritmos", spine: ["algoritmos", "python", "persistencia"] },
      ],
      branches: { python: ["programación orientada a objetos"] },
      branchOwnerOverrides: {},
      spinePromotions: ["persistencia"],
      branchLayoutFlips: {},
    });

    const { curation, changed } = normalize(withPromotions);

    expect(changed).toBe(true);
    expect(curation.parallelLanes[0]!.spine).toEqual(["algoritmos", "python", "persistencia"]);
    expect(curation.branches.python).toEqual(["programación orientada a objetos"]);
    expect(curation.spinePromotions ?? []).toEqual([]);
  });

  it("preserves curated spine order for direct storage (Subir/Bajar)", () => {
    const curated = roadmapCuration({
      degreeSlug: "programacion-i",
      parallelLanes: [
        {
          root: "persistencia",
          spine: ["persistencia", "programación orientada a objetos", "python", "algoritmos"],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
    });

    const { curation, changed } = normalize(curated);

    expect(changed).toBe(false);
    expect(curation.parallelLanes[0]!.spine).toEqual(curated.parallelLanes[0]!.spine);
  });
});
