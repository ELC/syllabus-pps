import { describe, expect, it } from "vitest";

import type { DegreeRoadmap } from "@pps/core";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";

function linearRoadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

describe("separate below inicio head fork", () => {
  it("splits sql and acid on parallel-only spine after head fork", () => {
    const afterHeadFork: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [
        { root: "modelo", spine: ["modelo", "sql", "acid", "alg", "trans"] },
      ],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
      ],
    };

    const result = separateSpineRangeToBranches(afterHeadFork, "sql", "acid");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks).toHaveLength(2);
    expect(result.curation.trunkForks![1]).toMatchObject({
      after: "sql",
      mergeInto: "alg",
      lanes: [
        { root: "sql", spine: ["sql"] },
        { root: "acid", spine: ["acid"] },
      ],
    });
    expect(result.curation.parallelLanes[0]!.spine).toContain("sql");
    expect(result.curation.parallelLanes[0]!.spine).toContain("alg");
  });

  it("splits when trunkSpine holds the linear tail", () => {
    const withTrunk: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: ["modelo", "sql", "acid", "alg", "trans"],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
      ],
    };

    const result = separateSpineRangeToBranches(withTrunk, "sql", "acid");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.curation.trunkForks).toHaveLength(2);
    expect(result.curation.trunkSpine).toEqual(["modelo", "sql", "alg", "trans"]);
  });

  it("places the merge join above the sql|acid fork row with a vertical gap", () => {
    const titles = ["modelo", "norm", "sql", "acid", "alg", "trans"];
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo", "sql", "acid", "alg", "trans"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
      ],
    };

    const separated = separateSpineRangeToBranches(curation, "sql", "acid");
    expect(separated.ok).toBe(true);
    if (!separated.ok) {
      return;
    }

    curation = separated.curation;
    const layout = buildRoadmapLayout(linearRoadmap(titles), buildAdjacency(linearRoadmap(titles)), curation);
    const sql = layout.placements.get("sql")!;
    const acid = layout.placements.get("acid")!;
    const norm = layout.placements.get("norm")!;

    expect(sql.y).toBeGreaterThan(norm.y + norm.height);
    expect(acid.y).toBe(sql.y);
    expect(sql.x).toBeLessThan(acid.x);

    const flow = buildRoadmapFlow({
      roadmap: linearRoadmap(titles),
      adjacency: buildAdjacency(linearRoadmap(titles)),
      layout,
      isTopicDone: () => false,
    });
    const mergeSql = flow.nodes.find((node) => node.id === "__join__in__sql");
    const splitSql = flow.nodes.find((node) => node.id === "__join__out____join__in__sql");
    expect(mergeSql?.position.x).toBeCloseTo(0, 0);
    expect(splitSql?.position.x).toBeCloseTo(0, 0);
  });
});
