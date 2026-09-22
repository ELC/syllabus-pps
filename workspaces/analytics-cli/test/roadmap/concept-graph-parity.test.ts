import { describe, expect, it } from "vitest";

import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import {
  mergeTrunkFork,
  promoteConceptToSpine,
  separateSpineRangeToBranches,
  shiftConceptInOrder,
  swapConceptOrder,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import {
  mergeTrunkFork as mergeTrunkForkLegacy,
  promoteConceptToSpine as promoteConceptToSpineLegacy,
  separateSpineRangeToBranches as separateSpineRangeToBranchesLegacy,
  shiftConceptInOrder as shiftConceptInOrderLegacy,
  swapConceptOrder as swapConceptOrderLegacy,
} from "../../../roadmap/src/components/roadmap/concept-curation-legacy";
import {
  mergeTrunkFork as mergeTrunkForkGraph,
  promoteConceptToSpine as promoteConceptToSpineGraph,
  separateSpineRangeToBranches as separateSpineRangeToBranchesGraph,
  shiftConceptInOrder as shiftConceptInOrderGraph,
  swapConceptOrder as swapConceptOrderGraph,
} from "../../../roadmap/src/components/roadmap/concept-curation-graph-ops";

const base: RoadmapCuration = {
  degreeSlug: "lds",
  parallelLanes: [{ root: "a", spine: ["a", "b", "c", "d", "e"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
};

function snapshot(curation: RoadmapCuration) {
  return {
    trunkSpine: curation.trunkSpine,
    parallelLanes: curation.parallelLanes,
    trunkForks: curation.trunkForks ?? [],
    branches: curation.branches,
    spinePromotions: curation.spinePromotions,
  };
}

describe("concept graph ops parity (legacy vs typed editor)", () => {
  it("swapConceptOrder on a linear lane", () => {
    const legacy = swapConceptOrderLegacy(base, "a", "b");
    const graph = swapConceptOrderGraph(base, "a", "b");
    expect(graph).not.toBeNull();
    expect(snapshot(graph!)).toEqual(snapshot(legacy!));
  });

  it("shiftConceptInOrder on a linear lane", () => {
    const legacy = shiftConceptInOrderLegacy(base, "a", 1);
    const graph = shiftConceptInOrderGraph(base, "a", 1);
    expect(graph).not.toBeNull();
    expect(snapshot(graph!)).toEqual(snapshot(legacy!));
  });

  it("shiftConceptInOrder swaps a fork lane topic with the fork anchor", () => {
    const forked: RoadmapCuration = {
      ...base,
      parallelLanes: [{ root: "modelo", spine: ["modelo", "sql", "ar", "acid"] }],
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
    };

    const legacy = shiftConceptInOrderLegacy(forked, "trans", -1);
    const graph = shiftConceptInOrderGraph(forked, "trans", -1);
    expect(graph).not.toBeNull();
    expect(snapshot(graph!)).toEqual(snapshot(legacy!));
  });

  it("separateSpineRangeToBranches on the main spine", () => {
    const legacy = separateSpineRangeToBranchesLegacy(base, "b", "d");
    const graph = separateSpineRangeToBranchesGraph(base, "b", "d");
    expect(graph).toEqual(legacy);
    if (legacy.ok && graph.ok) {
      expect(snapshot(graph.curation)).toEqual(snapshot(legacy.curation));
    }
  });

  it("mergeTrunkFork collapses a two-lane fork", () => {
    const forked: RoadmapCuration = {
      ...base,
      trunkSpine: ["a", "e"],
      parallelLanes: [{ root: "a", spine: ["a"] }],
      trunkForks: [
        {
          after: "a",
          mergeInto: "e",
          lanes: [
            { root: "b", spine: ["b", "c"] },
            { root: "d", spine: ["d"] },
          ],
        },
      ],
    };

    const legacy = mergeTrunkForkLegacy(forked, "a");
    const graph = mergeTrunkForkGraph(forked, "a");
    expect(graph).toEqual(legacy);
    if (legacy.ok && graph.ok) {
      expect(snapshot(graph.curation)).toEqual(snapshot(legacy.curation));
    }
  });

  it("mergeTrunkFork partial lane merge with spine-only topic in the fork gap", () => {
    const forked: RoadmapCuration = {
      ...base,
      trunkSpine: ["m", "norm", "trans"],
      parallelLanes: [{ root: "m", spine: ["m"] }],
      trunkForks: [
        {
          after: "m",
          mergeInto: "trans",
          lanes: [
            { root: "alg", spine: ["alg"] },
            { root: "sql", spine: ["sql"] },
          ],
        },
      ],
    };

    const legacy = mergeTrunkForkLegacy(forked, "sql");
    const graph = mergeTrunkForkGraph(forked, "sql");
    expect(graph.ok, graph.ok ? "" : JSON.stringify(graph)).toBe(legacy.ok);
    if (legacy.ok && graph.ok) {
      expect(snapshot(graph.curation)).toEqual(snapshot(legacy.curation));
    }
  });

  it("promoteConceptToSpine from lateral branches", () => {
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo", "sql"] }],
      postMergeSpine: [],
      branches: { modelo: ["norm"], sql: ["ar"] },
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [],
    };

    for (const title of ["norm", "ar"] as const) {
      const legacy = promoteConceptToSpineLegacy(curation, title);
      const graph = promoteConceptToSpineGraph(curation, title);
      expect(graph.ok).toBe(legacy.ok);
      if (!legacy.ok || !graph.ok) {
        return;
      }
      expect(snapshot(graph.curation)).toEqual(snapshot(legacy.curation));
      curation = legacy.curation;
    }
  });
});
