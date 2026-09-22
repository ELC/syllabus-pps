import { describe, expect, it } from "vitest";

import { Admissibility, curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph";
import { planShiftOnCuration } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

const linear: RoadmapCuration = {
  degreeSlug: "t",
  parallelLanes: [{ root: "a", spine: ["a", "b", "c"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
};

describe("typed shift admissibility", () => {
  it("returns Allowed with curation when shift is valid", () => {
    const plan = planShiftOnCuration(linear, "b", 1);
    expect(plan.admissibility).toBe(Admissibility.Allowed);
    if (plan.admissibility === Admissibility.Allowed) {
      expect(plan.curation.parallelLanes[0]!.spine).toEqual(["a", "c", "b"]);
    }
  });

  it("returns Blocked at spine ends", () => {
    const up = planShiftOnCuration(linear, "a", -1);
    expect(up.admissibility).toBe(Admissibility.Blocked);
    if (up.admissibility === Admissibility.Blocked) {
      expect(up.error).toBe("shift-no-neighbor");
    }
  });

  it("shift lane topic past fork anchor preserves fork invariants", () => {
    const forked: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo", "sql", "ar", "acid"] }],
      postMergeSpine: [],
      trunkSpine: ["modelo", "sql", "ar", "acid"],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "trans", spine: ["trans"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    const plan = planShiftOnCuration(forked, "trans", -1);
    expect(plan.admissibility).toBe(Admissibility.Allowed);
    if (plan.admissibility !== Admissibility.Allowed) {
      return;
    }

    expect(curationSatisfiesInvariants(plan.curation)).toBe(true);
    expect(plan.curation.trunkForks![0]).toMatchObject({
      after: "trans",
      mergeInto: "sql",
    });
    expect(plan.curation.trunkSpine).toEqual(["trans", "sql", "ar", "acid"]);
  });
});
