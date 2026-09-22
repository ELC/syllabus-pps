import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { mergeImplicitLayoutBranches } from "../../../roadmap/src/components/roadmap/concept-curation";
import {
  canShiftConceptInOrder,
  planShiftOnCuration,
  shiftConceptInOrder,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { Admissibility } from "../../../roadmap/src/concept-graph";

const courseRoadmap: DegreeRoadmap = {
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
};

const storedCuration: RoadmapCuration = {
  degreeSlug: "programacion-i",
  parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "python", "persistencia"] }],
  postMergeSpine: [],
  trunkSpine: [],
  trunkForks: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["persistencia"],
  branchLayoutFlips: {},
};

describe("shift with layout-implicit branches", () => {
  it("allows subir POO once the lateral is merged for order edits", () => {
    const adjacency = buildAdjacency(courseRoadmap);
    const forEdits = mergeImplicitLayoutBranches(storedCuration, courseRoadmap, adjacency);

    expect(forEdits.branches.python).toContain("programación orientada a objetos");
    expect(canShiftConceptInOrder(forEdits, "programación orientada a objetos", -1)).toBe(true);
    expect(
      planShiftOnCuration(forEdits, "programación orientada a objetos", -1).admissibility,
    ).toBe(Admissibility.Allowed);

    const shifted = shiftConceptInOrder(forEdits, "programación orientada a objetos", -1);
    expect(shifted).not.toBeNull();
    expect(shifted!.parallelLanes[0]!.spine).toEqual([
      "algoritmos",
      "programación orientada a objetos",
      "python",
      "persistencia",
    ]);
    expect(shifted!.trunkSpine ?? []).toEqual([]);
    expect(shifted!.branches.python).toBeUndefined();
    expect(Object.values(shifted!.branches).flat()).not.toContain(
      "programación orientada a objetos",
    );
  });
});
