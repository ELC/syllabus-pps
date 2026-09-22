import { describe, expect, it } from "vitest";

import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import {
  Admissibility,
  decodeCuration,
  encodeSubgraph,
  initialSubgraphFromTitles,
} from "../../../roadmap/src/concept-graph";
import { planMergeFork } from "../../../roadmap/src/concept-graph/editor/merge";
import { flattenSubgraph } from "../../../roadmap/src/concept-graph/traverse";
import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";

describe("concept graph codec", () => {
  it("round-trips a linear subgraph", () => {
    const subgraph = initialSubgraphFromTitles("t", ["a", "b", "c"]);
    const curation = encodeSubgraph(subgraph);
    const decoded = decodeCuration(curation);
    expect(decoded.outcome).toBe("decoded");
    if (decoded.outcome !== "decoded") {
      return;
    }

    expect(decoded.subgraph.trunk.map((segment) => segment)).toEqual(subgraph.trunk);
  });

  it("decodes a forked curation produced by legacy separate", () => {
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo", "norm", "sql", "ar", "acid", "trans"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [],
    };

    curation = separateSpineRangeToBranches(curation, "modelo", "norm").curation!;
    const decoded = decodeCuration(curation);
    expect(decoded.outcome).toBe("decoded");
    if (decoded.outcome !== "decoded") {
      return;
    }

    expect(decoded.subgraph.trunk.length).toBeGreaterThan(0);
  });

  it("decodes spine-only topics inside a fork gap", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "m", spine: ["m"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: ["m", "norm", "trans"],
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

    const decoded = decodeCuration(curation);
    expect(decoded.outcome).toBe("decoded");
    if (decoded.outcome !== "decoded") {
      return;
    }

    expect(flattenSubgraph(decoded.subgraph)).toContain("sql");
    const plan = planMergeFork(decoded.subgraph, "sql");
    expect(plan.admissibility).toBe(Admissibility.Allowed);
  });

  it("decodes a fork whose mergeInto lives only on the expanded spine", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "m", spine: ["m"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
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

    const decoded = decodeCuration(curation);
    expect(decoded.outcome).toBe("decoded");
    if (decoded.outcome !== "decoded") {
      return;
    }

    expect(flattenSubgraph(decoded.subgraph)).toEqual(
      expect.arrayContaining(["m", "norm", "sql", "t"]),
    );
  });
});
