import { describe, expect, it } from "vitest";

import {
  canShiftConceptInOrder,
  mergeTrunkFork,
  promoteConceptToSpine,
  separateSpineRangeToBranches,
  shiftConceptInOrder,
  swapConceptOrder,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

const base: RoadmapCuration = {
  degreeSlug: "lds",
  parallelLanes: [{ root: "a", spine: ["a", "b", "c", "d", "e"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
};

describe("swapConceptOrder", () => {
  it("swaps two spine neighbors in the same lane", () => {
    const next = swapConceptOrder(base, "a", "b");
    expect(next?.parallelLanes[0]!.spine).toEqual(["b", "a", "c", "d", "e"]);
  });
});

describe("shiftConceptInOrder", () => {
  it("moves a spine concept down one step", () => {
    const next = shiftConceptInOrder(base, "a", 1);
    expect(next?.parallelLanes[0]!.spine).toEqual(["b", "a", "c", "d", "e"]);
  });
});

describe("separateSpineRangeToBranches", () => {
  it("allows a fork that opens on the first spine topic (right after Inicio)", () => {
    const spineOnly: RoadmapCuration = {
      ...base,
      parallelLanes: [{ root: "a", spine: ["a", "b", "c"] }],
      trunkSpine: [],
    };

    const result = separateSpineRangeToBranches(spineOnly, "a", "b");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks![0]).toMatchObject({
      after: "a",
      mergeInto: "c",
      lanes: [
        { root: "a", spine: ["a"] },
        { root: "b", spine: ["b"] },
      ],
    });
    expect(result.curation.parallelLanes[0]!.spine).toEqual(["a", "c"]);
    expect(result.curation.trunkSpine).toBeUndefined();
  });

  it("allows a fork that merges on the last spine topic (right before Objetivo)", () => {
    const spineOnly: RoadmapCuration = {
      ...base,
      parallelLanes: [{ root: "a", spine: ["a", "b", "c", "d"] }],
      trunkSpine: [],
    };

    const result = separateSpineRangeToBranches(spineOnly, "c", "d");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks![0]).toMatchObject({
      after: "b",
      mergeInto: "d",
    });
    expect(result.curation.parallelLanes[0]!.spine).toEqual(["a", "b", "d"]);
  });

  it("creates a trunk fork instead of lateral branches", () => {
    const result = separateSpineRangeToBranches(base, "b", "d");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkSpine).toEqual(["a", "e"]);
    expect(result.curation.parallelLanes[0]!.spine).toEqual(["a"]);
    expect(result.curation.branches).toEqual({});
    expect(result.curation.trunkForks).toHaveLength(1);
    expect(result.curation.trunkForks![0]).toEqual({
      after: "a",
      mergeInto: "e",
      lanes: [
        { root: "b", spine: ["b", "c"] },
        { root: "d", spine: ["d"] },
      ],
    });
  });
});

describe("mergeTrunkFork", () => {
  it("collapses when mergeInto is stored only on the parallel lane spine", () => {
    const forked: RoadmapCuration = {
      ...base,
      parallelLanes: [{ root: "m", spine: ["m"] }],
      trunkSpine: [],
      trunkForks: [
        {
          after: "m",
          mergeInto: "t",
          lanes: [
            { root: "norm", spine: ["norm"] },
            { root: "sql", spine: ["sql"] },
          ],
        },
      ],
    };

    const merged = mergeTrunkFork(forked, "norm");
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.curation.trunkForks).toEqual([]);
      expect(merged.curation.parallelLanes[0]!.spine).toEqual(["m", "norm", "sql", "t"]);
    }
  });

  it("collapses fork lanes back onto the trunk spine", () => {
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

    const merged = mergeTrunkFork(forked, "a");
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.curation.trunkSpine).toEqual(["a", "b", "c", "d", "e"]);
      expect(merged.curation.trunkForks).toEqual([]);
    }
  });

  it("merges only the clicked lane when the fork has more than two lanes", () => {
    const forked: RoadmapCuration = {
      ...base,
      trunkSpine: ["m", "sql", "trans"],
      parallelLanes: [{ root: "m", spine: ["m"] }],
      trunkForks: [
        {
          after: "m",
          mergeInto: "sql",
          lanes: [
            { root: "norm", spine: ["norm"] },
            { root: "alg", spine: ["alg"] },
            { root: "acid", spine: ["acid"] },
          ],
        },
      ],
    };

    const merged = mergeTrunkFork(forked, "alg");
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.curation.trunkSpine).toEqual(["m", "sql", "trans"]);
      expect(merged.curation.trunkForks![0]!.lanes).toHaveLength(2);
      expect(merged.curation.trunkForks![0]!.lanes[0]!.spine).toEqual(["norm", "alg"]);
      expect(merged.curation.trunkForks![0]!.lanes[1]!.spine).toEqual(["acid"]);
    }
  });

  it("merges one lane when a spine-only topic sits in the fork with two lanes", () => {
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

    const merged = mergeTrunkFork(forked, "sql");
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.curation.trunkSpine).toEqual(["m", "norm", "trans"]);
      expect(merged.curation.trunkForks![0]!.lanes).toHaveLength(1);
      expect(merged.curation.trunkForks![0]!.lanes[0]!.spine).toEqual(["alg", "sql"]);
    }
  });

  it("collapses two lanes and keeps spine-only topics when only two branches exist", () => {
    const forked: RoadmapCuration = {
      ...base,
      trunkSpine: ["m", "norm", "trans"],
      parallelLanes: [{ root: "m", spine: ["m"] }],
      trunkForks: [
        {
          after: "m",
          mergeInto: "trans",
          lanes: [{ root: "sql", spine: ["sql"] }],
        },
      ],
    };

    const merged = mergeTrunkFork(forked, "sql");
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.curation.trunkSpine).toEqual(["m", "norm", "sql", "trans"]);
      expect(merged.curation.trunkForks).toEqual([]);
    }
  });

  it(
    "keeps parallel-only mode after A columna promotes every side branch " +
      "so the tail separate stays on a single lane spine",
    () => {
      // Reproduces user report: hierarchical concept graph (Modelo/SQL trunk
      // with lateral norm/ar/acid/trans), promote every side branch to the
      // spine ("A columna"), then Separar on the last two. Bug: the follow-up
      // separate wrote parallelLanes.spine = [forkAfter] and trunkSpine =
      // mainSpine, producing a graph where the fork.after ("trans") ended up
      // at the top of the layout ahead of the rest of the trunk. Fix:
      // promoteConceptToSpine keeps an empty trunkSpine ([] vs. undefined) so
      // subsequent separate ops stay in parallel-only mode.
      let curation: RoadmapCuration = {
        degreeSlug: "t",
        parallelLanes: [{ root: "modelo", spine: ["modelo", "sql"] }],
        postMergeSpine: [],
        branches: {
          modelo: ["norm"],
          sql: ["ar", "acid", "trans"],
        },
        branchOwnerOverrides: {},
        spineJoins: {},
        trunkSpine: [],
        trunkForks: [],
      };

      for (const title of ["norm", "ar", "acid", "trans"]) {
        const promoted = promoteConceptToSpine(curation, title);
        expect(promoted.ok, promoted.ok ? "" : `promote ${title}: ${promoted.error}`).toBe(true);
        if (!promoted.ok) {
          return;
        }
        curation = promoted.curation;
      }

      // After all promotions the spine should still be in a single lane and
      // trunkSpine kept as the empty parallel-only marker.
      expect(curation.trunkSpine).toEqual([]);
      const spineAfterColumn = curation.parallelLanes[0]?.spine ?? [];
      expect(spineAfterColumn).toHaveLength(6);

      const last = spineAfterColumn[spineAfterColumn.length - 1]!;
      const prev = spineAfterColumn[spineAfterColumn.length - 2]!;
      const separated = separateSpineRangeToBranches(curation, prev, last);
      expect(separated.ok, separated.ok ? "" : JSON.stringify(separated)).toBe(true);
      if (!separated.ok) {
        return;
      }
      curation = separated.curation;

      expect(curation.trunkSpine).toBeUndefined();
      const remainingLaneSpine = curation.parallelLanes[0]?.spine ?? [];
      expect(remainingLaneSpine).not.toContain(prev);
      expect(remainingLaneSpine).toContain(last);
      const [fork] = curation.trunkForks ?? [];
      expect(fork?.mergeInto).toBe(last);
      expect(fork?.lanes.map((lane) => lane.spine[0]).sort()).toEqual([prev, last].sort());
    },
  );
});

describe("separateSpineRangeToBranches within an existing fork", () => {
  it("adds a nested fork below an existing trunk fork without replacing it", () => {
    const forked: RoadmapCuration = {
      ...base,
      trunkSpine: ["m", "trans", "acid", "alg"],
      parallelLanes: [{ root: "m", spine: ["m"] }],
      trunkForks: [
        {
          after: "m",
          mergeInto: "sql",
          lanes: [
            { root: "norm", spine: ["norm"] },
            { root: "sql", spine: ["sql"] },
          ],
        },
      ],
    };

    const result = separateSpineRangeToBranches(forked, "trans", "acid");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks).toHaveLength(2);
    expect(result.curation.trunkForks![0]).toEqual(forked.trunkForks![0]);
    expect(result.curation.trunkForks![1]).toMatchObject({
      after: "sql",
      mergeInto: "alg",
      lanes: [
        { root: "trans", spine: ["trans"] },
        { root: "acid", spine: ["acid"] },
      ],
    });
    expect(result.curation.trunkSpine).toEqual(["m", "sql", "alg"]);
  });

  it("adds another lane to the same trunk fork", () => {
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

    const result = separateSpineRangeToBranches(forked, "c", "d");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks).toHaveLength(1);
    expect(result.curation.trunkForks![0]!.lanes).toHaveLength(3);
    expect(result.curation.trunkForks![0]!.lanes[0]!.spine).toEqual(["b"]);
    expect(result.curation.trunkForks![0]!.lanes[1]!.spine).toEqual(["c"]);
    expect(result.curation.trunkForks![0]!.lanes[2]!.spine).toEqual(["d"]);
  });

  it("splits from a fork lane through the merge node on the main spine", () => {
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

    const result = separateSpineRangeToBranches(forked, "b", "e");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkSpine).toEqual(["a", "e"]);
    expect(result.curation.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["b", "c"],
      ["d"],
    ]);
  });

  it("peels the last fork-lane topic when the merge node is the second pick", () => {
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

    const result = separateSpineRangeToBranches(forked, "d", "e");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["b", "c"],
      ["d"],
    ]);
  });

  it("extends an existing fork from the parallel spine through the merge node", () => {
    const forked: RoadmapCuration = {
      ...base,
      parallelLanes: [{ root: "a", spine: ["a", "b", "c", "d", "e"] }],
      trunkForks: [
        {
          after: "a",
          mergeInto: "e",
          lanes: [],
        },
      ],
    };

    const result = separateSpineRangeToBranches(forked, "b", "e");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.parallelLanes[0]!.spine).toEqual(["a", "e"]);
    expect(result.curation.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["b", "c"],
      ["d"],
    ]);
  });

  it("pulls a spine-only topic between fork anchors into new fork lanes", () => {
    const forked: RoadmapCuration = {
      ...base,
      trunkSpine: ["a", "x", "e"],
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

    const result = separateSpineRangeToBranches(forked, "c", "x");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkSpine).toEqual(["a", "e"]);
    expect(result.curation.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["b"],
      ["c", "d"],
      ["x"],
    ]);
  });
});

describe("shiftConceptInOrder after a trunk fork", () => {
  it("keeps fork anchors reorderable when the spine still has outer neighbors", () => {
    const forked: RoadmapCuration = {
      degreeSlug: "lds",
      parallelLanes: [{ root: "w", spine: ["w", "x", "a", "e", "f"] }],
      postMergeSpine: [],
      trunkSpine: ["w", "x", "a", "e", "f"],
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
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    expect(canShiftConceptInOrder(forked, "a", -1)).toBe(true);
    expect(canShiftConceptInOrder(forked, "e", 1)).toBe(true);
    expect(canShiftConceptInOrder(forked, "a", 1)).toBe(true);
    expect(canShiftConceptInOrder(forked, "e", -1)).toBe(true);

    const shifted = shiftConceptInOrder(forked, "a", -1);
    expect(shifted?.trunkSpine).toEqual(["w", "a", "x", "e", "f"]);

    const throughFork = shiftConceptInOrder(forked, "a", 1);
    expect(throughFork?.trunkForks![0]!.after).toBe("b");
    expect(throughFork?.trunkForks![0]!.lanes[0]!.spine).toEqual(["a", "c"]);
    expect(throughFork?.trunkForks![0]!.lanes[1]!.spine).toEqual(["d"]);

    const mergeNeighbor = shiftConceptInOrder(forked, "e", -1);
    expect(mergeNeighbor?.trunkForks![0]!.mergeInto).toBe("d");
    expect(mergeNeighbor?.trunkForks![0]!.lanes[1]!.spine).toEqual(["e"]);

    const postMerge = shiftConceptInOrder(forked, "f", -1);
    expect(postMerge?.trunkSpine).toEqual(["w", "x", "a", "f", "e"]);
    expect(postMerge?.trunkForks![0]!.mergeInto).toBe("f");
    expect(postMerge?.trunkForks![0]!.lanes).toEqual(forked.trunkForks![0]!.lanes);
  });

  it("exchanges fork lanes when Subir crosses from one lane into the previous", () => {
    const forked: RoadmapCuration = {
      degreeSlug: "lds",
      parallelLanes: [{ root: "m", spine: ["m", "t"] }],
      postMergeSpine: [],
      trunkSpine: ["m", "t"],
      trunkForks: [
        {
          after: "m",
          mergeInto: "t",
          lanes: [
            { root: "norm", spine: ["norm", "sql"] },
            { root: "acid", spine: ["acid", "alg"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    const shifted = shiftConceptInOrder(forked, "acid", -1);
    expect(shifted?.trunkForks![0]!.lanes[0]!.spine).toEqual(["norm", "acid"]);
    expect(shifted?.trunkForks![0]!.lanes[1]!.spine).toEqual(["sql", "alg"]);
  });

  it("moves the merge node down past the next trunk topic", () => {
    const forked: RoadmapCuration = {
      degreeSlug: "lds",
      parallelLanes: [{ root: "m", spine: ["m"] }],
      postMergeSpine: [],
      trunkSpine: ["m", "acid", "trans"],
      trunkForks: [
        {
          after: "m",
          mergeInto: "acid",
          lanes: [
            { root: "norm", spine: ["norm"] },
            { root: "sql", spine: ["sql", "alg"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    const shifted = shiftConceptInOrder(forked, "acid", 1);
    expect(shifted?.trunkSpine).toEqual(["m", "trans", "acid"]);
    expect(shifted?.trunkForks![0]!.mergeInto).toBe("trans");
    expect(shifted?.trunkForks![0]!.lanes).toEqual(forked.trunkForks![0]!.lanes);
  });

  it("swaps two topics within a multi-node fork lane without collapsing nested forks", () => {
    const forked: RoadmapCuration = {
      degreeSlug: "lds",
      parallelLanes: [{ root: "modelo", spine: ["modelo"] }],
      postMergeSpine: [],
      trunkSpine: ["modelo", "sql", "trans"],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
        {
          after: "sql",
          mergeInto: "trans",
          lanes: [
            { root: "sql", spine: ["sql"] },
            { root: "ar", spine: ["ar", "acid"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    const shifted = shiftConceptInOrder(forked, "acid", -1);
    expect(shifted?.trunkSpine).toEqual(["modelo", "sql", "trans"]);
    expect(shifted?.trunkForks).toHaveLength(2);
    expect(shifted?.trunkForks![1]!.lanes[1]!.spine).toEqual(["acid", "ar"]);
  });

  it("keeps fork lanes when the merge anchor swaps with the next spine topic", () => {
    const forked: RoadmapCuration = {
      degreeSlug: "lds",
      parallelLanes: [{ root: "m", spine: ["m"] }],
      postMergeSpine: [],
      trunkSpine: ["m", "acid", "alg"],
      trunkForks: [
        {
          after: "m",
          mergeInto: "acid",
          lanes: [
            { root: "norm", spine: ["norm", "sql"] },
            { root: "trans", spine: ["trans"] },
          ],
        },
      ],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
    };

    const shifted = shiftConceptInOrder(forked, "acid", 1);
    expect(shifted?.trunkSpine).toEqual(["m", "alg", "acid"]);
    expect(shifted?.trunkForks![0]!.mergeInto).toBe("alg");
    expect(shifted?.trunkForks![0]!.lanes[0]!.spine).toEqual(["norm", "sql"]);
    expect(shifted?.trunkForks![0]!.lanes[1]!.spine).toEqual(["trans"]);
  });
});

describe("promoteConceptToSpine", () => {
  it("moves a lateral concept back onto the trunk after its owner", () => {
    const withSide: RoadmapCuration = {
      ...base,
      parallelLanes: [{ root: "a", spine: ["a", "b", "c"] }],
      branches: { b: ["side"] },
      branchOwnerOverrides: { side: "b" },
    };
    const promoted = promoteConceptToSpine(withSide, "side");
    expect(promoted.ok).toBe(true);
    if (promoted.ok) {
      expect(promoted.curation.parallelLanes[0]!.spine).toContain("side");
      expect(promoted.curation.spinePromotions).toContain("side");
    }
  });
});
