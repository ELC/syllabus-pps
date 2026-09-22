import { describe, expect, it } from "vitest";

import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const beforeSeparate = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [
    { root: "modelo entidad-relación", spine: ["modelo entidad-relación"] },
  ],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkSpine: ["modelo entidad-relación", "sql", "ACID", "transacciones"],
  trunkForks: [
    {
      after: "modelo entidad-relación",
      mergeInto: "sql",
      lanes: [
        { root: "modelo entidad-relación", spine: ["modelo entidad-relación"] },
        { root: "normalización", spine: ["normalización"] },
      ],
    },
    {
      after: "sql",
      mergeInto: "ACID",
      lanes: [
        { root: "sql", spine: ["sql"] },
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
      ],
    },
  ],
} satisfies RoadmapCuration;

describe("separate ACID–transacciones on compressed tail", () => {
  it("adds a two-lane tail fork and leaves the sql fork unchanged", () => {
    const result = separateSpineRangeToBranches(beforeSeparate, "ACID", "transacciones");
    expect(result.ok, result.ok ? "" : JSON.stringify(result)).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(curationSatisfiesInvariants(result.curation)).toBe(true);
    expect(result.curation.trunkForks).toHaveLength(3);

    const sqlFork = result.curation.trunkForks!.find((fork) => fork.after === "sql");
    expect(sqlFork).toMatchObject({
      after: "sql",
      mergeInto: "ACID",
      lanes: [
        { root: "sql", spine: ["sql"] },
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
      ],
    });

    const tailFork = result.curation.trunkForks!.find(
      (fork) => fork.mergeInto === "transacciones",
    );
    expect(tailFork?.lanes.map((lane) => lane.spine)).toEqual([
      ["ACID"],
      ["transacciones"],
    ]);

    expect(result.curation.trunkSpine).toEqual([
      "modelo entidad-relación",
      "sql",
      "ACID",
      "transacciones",
    ]);
  });
});
