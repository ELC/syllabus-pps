import { describe, expect, it } from "vitest";

import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";
import { shiftConceptInOrder } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import { shiftConceptInOrder as shiftLegacy } from "../../../roadmap/src/components/roadmap/concept-curation-legacy";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

const previousCuration = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [
    {
      root: "modelo entidad-relación",
      spine: ["modelo entidad-relación"],
    },
  ],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkForks: [
    {
      after: "modelo entidad-relación",
      lanes: [
        { root: "normalización", spine: ["normalización"] },
        { root: "sql", spine: ["sql"] },
      ],
      mergeInto: "álgebra relacional",
    },
    {
      after: "álgebra relacional",
      lanes: [
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
        { root: "transacciones", spine: ["transacciones"] },
      ],
      mergeInto: "ACID",
    },
  ],
  trunkSpine: ["modelo entidad-relación", "álgebra relacional", "ACID"],
} satisfies RoadmapCuration;

describe("subir transacciones at consecutive forks", () => {
  it("first subir swaps lanes with álgebra relacional inside the downstream fork", () => {
    const shifted = shiftLegacy(structuredClone(previousCuration), "transacciones", -1);
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

    const graph = shiftConceptInOrder(previousCuration, "transacciones", -1);
    expect(graph).toEqual(shifted);
  });

  it("second subir swaps transacciones with sql across forks", () => {
    const step1 = shiftLegacy(structuredClone(previousCuration), "transacciones", -1);
    const shifted = shiftLegacy(step1!, "transacciones", -1);
    expect(shifted).not.toBeNull();
    expect(step1!.trunkForks![1]!.lanes.map((l) => l.spine)).toEqual([
      ["transacciones"],
      ["álgebra relacional"],
    ]);
    expect(curationSatisfiesInvariants(shifted!)).toBe(true);

    expect(shifted!.trunkForks).toHaveLength(2);
    expect(shifted!.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["normalización"],
      ["transacciones"],
    ]);
    expect(shifted!.trunkForks![1]!.lanes.map((lane) => lane.spine)).toEqual([
      ["sql"],
      ["álgebra relacional"],
    ]);
    expect(shifted!.trunkSpine).toEqual([
      "modelo entidad-relación",
      "álgebra relacional",
      "ACID",
    ]);

    let graph = shiftConceptInOrder(previousCuration, "transacciones", -1);
    graph = shiftConceptInOrder(graph!, "transacciones", -1);
    expect(graph).toEqual(shifted);
  });

  it("bajar transacciones swaps lanes back with álgebra relacional inside fork 2", () => {
    const step1 = shiftLegacy(structuredClone(previousCuration), "transacciones", -1);
    const bajar = shiftLegacy(step1!, "transacciones", 1);
    expect(bajar).not.toBeNull();
    expect(curationSatisfiesInvariants(bajar!)).toBe(true);
    expect(bajar!.trunkForks![1]!.lanes.map((lane) => lane.spine)).toEqual([
      ["álgebra relacional"],
      ["transacciones"],
    ]);
    expect(bajar!.trunkSpine).toEqual(previousCuration.trunkSpine);
    expect(bajar!.trunkForks![1]!.mergeInto).toBe("ACID");
  });

  it("bajar transacciones reverses the cross-fork swap with sql", () => {
    const step1 = shiftLegacy(structuredClone(previousCuration), "transacciones", -1);
    const step2 = shiftLegacy(step1!, "transacciones", -1);
    const bajar = shiftLegacy(step2!, "transacciones", 1);
    expect(bajar).not.toBeNull();
    expect(curationSatisfiesInvariants(bajar!)).toBe(true);
    expect(bajar!.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["normalización"],
      ["sql"],
    ]);
    expect(bajar!.trunkForks![1]!.lanes.map((lane) => lane.spine)).toEqual([
      ["transacciones"],
      ["álgebra relacional"],
    ]);
  });
});
