import { describe, expect, it } from "vitest";

import { expandedCurationOrder } from "../../../roadmap/src/concept-graph/traverse-expanded";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";
import { shiftConceptInOrder } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

const nestedForks = {
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
      mergeInto: "ACID",
      lanes: [
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
        { root: "transacciones", spine: ["transacciones"] },
      ],
    },
  ],
  trunkSpine: ["modelo entidad-relación", "álgebra relacional", "ACID"],
} satisfies RoadmapCuration;

describe("subir transacciones follows expanded order past álgebra relacional", () => {
  it("expanded neighbor is álgebra relacional, not sql", () => {
    const expanded = expandedCurationOrder(nestedForks);
    expect(expanded).toEqual([
      "modelo entidad-relación",
      "normalización",
      "sql",
      "álgebra relacional",
      "transacciones",
      "ACID",
    ]);
    expect(expanded[expanded.indexOf("transacciones") - 1]).toBe("álgebra relacional");
  });

  it("first subir reorders lanes against álgebra relacional, not sql", () => {
    const shifted = shiftConceptInOrder(nestedForks, "transacciones", -1);
    expect(shifted).not.toBeNull();
    expect(curationSatisfiesInvariants(shifted!)).toBe(true);
    expect(shifted!.trunkForks![1]!.lanes.map((lane) => lane.spine)).toEqual([
      ["transacciones"],
      ["álgebra relacional"],
    ]);
    expect(shifted!.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["normalización"],
      ["sql"],
    ]);
  });

  it("second subir swaps transacciones with sql across forks", () => {
    const step1 = shiftConceptInOrder(nestedForks, "transacciones", -1);
    const shifted = shiftConceptInOrder(step1!, "transacciones", -1);
    expect(shifted).not.toBeNull();
    expect(curationSatisfiesInvariants(shifted!)).toBe(true);
    expect(shifted!.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["normalización"],
      ["transacciones"],
    ]);
    expect(shifted!.trunkForks![1]!.lanes.map((lane) => lane.spine)).toEqual([
      ["sql"],
      ["álgebra relacional"],
    ]);
  });
});
