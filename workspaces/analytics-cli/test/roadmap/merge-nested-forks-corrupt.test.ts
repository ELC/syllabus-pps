import { describe, expect, it } from "vitest";

import { mergeTrunkFork } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const corruptAfterBadBajar = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [
    { root: "modelo entidad-relación", spine: ["modelo entidad-relación"] },
  ],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkForks: [
    {
      after: "modelo entidad-relación",
      mergeInto: "álgebra relacional",
      lanes: [
        { root: "normalización", spine: ["normalización"] },
        { root: "sql", spine: ["sql"] },
      ],
    },
    {
      after: "álgebra relacional",
      mergeInto: "transacciones",
      lanes: [
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
        { root: "ACID", spine: ["ACID"] },
      ],
    },
  ],
  trunkSpine: ["modelo entidad-relación", "álgebra relacional", "transacciones"],
} satisfies RoadmapCuration;

describe("merge fork after corrupted bajar state", () => {
  it("Unir ramas uses legacy merge when graph publish would drop topics", () => {
    expect(curationSatisfiesInvariants(corruptAfterBadBajar)).toBe(true);
    expect(mergeTrunkFork(corruptAfterBadBajar, "modelo entidad-relación").ok).toBe(true);
    expect(mergeTrunkFork(corruptAfterBadBajar, "álgebra relacional").ok).toBe(true);
  });
});
