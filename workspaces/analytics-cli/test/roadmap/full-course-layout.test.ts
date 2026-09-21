import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";

function roadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

function spineEdgeList(layout: ReturnType<typeof buildRoadmapLayout>, titles: string[]) {
  const rm = roadmap(titles);
  const adj = buildAdjacency(rm);
  const flow = buildRoadmapFlow({ roadmap: rm, adjacency: adj, layout, isTopicDone: () => false });
  return flow.edges
    .filter((e) => e.className?.includes("roadmap__edge--spine"))
    .map((e) => `${e.source}->${e.target}`);
}

describe("full course concept layout", () => {
  const titles = ["modelo", "norm", "sql", "acid", "alg", "trans"];

  function headForkThenSqlAcid(): RoadmapCuration {
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: titles }],
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
      throw new Error("setup failed");
    }
    return separated.curation;
  }

  it("head fork + sql|acid: trunk omits lane-only titles and spine edges avoid cross-lane shortcuts", () => {
    const curation = headForkThenSqlAcid();
    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);

    expect(layout.trunk).toEqual(["modelo", "sql", "alg", "trans"]);
    expect(layout.trunk.includes("norm")).toBe(false);
    expect(layout.trunk.includes("acid")).toBe(false);
    expect(layout.trunk.includes("ar")).toBe(false);

    const sql = layout.placements.get("sql")!;
    const acid = layout.placements.get("acid")!;
    const ar = layout.placements.get("ar");
    expect(acid.y).toBe(sql.y);
    expect(sql.x).toBeLessThan(acid.x);
    if (ar) {
      expect(ar.y).toBe(acid.y);
    }

    const edges = spineEdgeList(layout, titles);
    expect(edges).not.toContain("modelo->sql");
    expect(edges).not.toContain("modelo->acid");
    expect(edges).toContain("__join__out____join__in__sql->sql");
    expect(edges).toContain("__join__out____join__in__sql->acid");
    expect(edges).not.toContain("modelo->norm");
  });

  it("separating the last two spine nodes before objetivo keeps a sane trunk and merge junction", () => {
    let curation = headForkThenSqlAcid();
    const tailSep = separateSpineRangeToBranches(curation, "alg", "trans");
    expect(tailSep.ok).toBe(true);
    if (!tailSep.ok) {
      return;
    }
    curation = tailSep.curation;

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    expect(layout.trunk.includes("acid")).toBe(false);
    expect(layout.trunk[0]).toBe("modelo");
    expect(layout.trunk[layout.trunk.length - 1]).toBe("trans");

    expect(curation.trunkForks?.length).toBeGreaterThan(1);
    expect(layout.trunk).toEqual(["modelo", "sql", "alg", "trans"]);

    const alg = layout.placements.get("alg")!;
    const trans = layout.placements.get("trans")!;
    expect(alg.y).toBe(trans.y);

    const edges = spineEdgeList(layout, titles);
    expect(edges).not.toContain("sql->__join__out__sql");
    expect(edges).not.toContain("sql->trans");
    expect(edges.some((edge) => edge.startsWith("trans->"))).toBe(true);
  });
});
