import { describe, expect, it } from "vitest";

import {
  CurationInvariantCode,
  curationInvariantViolations,
  curationSatisfiesInvariants,
} from "../../../roadmap/src/concept-graph/invariants";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

describe("concept curation invariants", () => {
  it("accepts nested forks after a cross-fork lane swap", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "bases-de-datos",
      parallelLanes: [{ root: "modelo entidad-relación", spine: ["modelo entidad-relación"] }],
      postMergeSpine: [],
      trunkSpine: ["modelo entidad-relación", "álgebra relacional", "ACID"],
      trunkForks: [
        {
          after: "modelo entidad-relación",
          mergeInto: "álgebra relacional",
          lanes: [
            { root: "normalización", spine: ["normalización"] },
            { root: "transacciones", spine: ["transacciones"] },
          ],
        },
        {
          after: "álgebra relacional",
          mergeInto: "ACID",
          lanes: [
            { root: "sql", spine: ["sql"] },
            { root: "álgebra relacional", spine: ["álgebra relacional"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    expect(curationSatisfiesInvariants(curation)).toBe(true);
  });

  it("accepts a valid trunk fork with lane-exclusive topics", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo", "sql", "ar", "acid"] }],
      postMergeSpine: [],
      trunkSpine: ["trans", "sql", "ar", "acid"],
      trunkForks: [
        {
          after: "trans",
          mergeInto: "sql",
          lanes: [
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    expect(curationSatisfiesInvariants(curation)).toBe(true);
  });

  it("rejects fork lane topics duplicated on the compressed trunk", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo"] }],
      postMergeSpine: [],
      trunkSpine: ["modelo", "norm", "sql"],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "norm", spine: ["norm"] },
            { root: "trans", spine: ["trans"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    expect(curationInvariantViolations(curation)).toContainEqual({
      code: CurationInvariantCode.LaneTopicOnCompressedTrunk,
      detail: "norm",
    });
  });

  it("rejects forks whose merge anchor precedes the open anchor on the trunk", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "a", spine: ["a", "b"] }],
      postMergeSpine: [],
      trunkSpine: ["b", "a"],
      trunkForks: [{ after: "a", mergeInto: "b", lanes: [{ root: "c", spine: ["c"] }] }],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    expect(curationInvariantViolations(curation)).toContainEqual({
      code: CurationInvariantCode.ForkMergeOrder,
      detail: "a->b",
    });
  });
});
