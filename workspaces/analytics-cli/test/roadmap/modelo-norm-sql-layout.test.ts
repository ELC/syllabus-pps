import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

function roadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

function junctionXs(layout: ReturnType<typeof buildRoadmapLayout>, titles: string[]) {
  const rm = roadmap(titles);
  const flow = buildRoadmapFlow({
    roadmap: rm,
    adjacency: buildAdjacency(rm),
    layout,
    isTopicDone: () => false,
  });
  return Object.fromEntries(
    flow.nodes
      .filter((n) => String(n.id).startsWith("__join__"))
      .map((n) => [n.id, n.position.x]),
  );
}

describe("modelo then norm|sql then acid|ar layout", () => {
  const titles = ["modelo", "norm", "sql", "acid", "ar", "alg", "trans"];

  it("fans out from modelo to norm|sql without a lopsided merge into the sql lane root", () => {
    const curation: RoadmapCuration = {
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
            { root: "norm", spine: ["norm", "acid"] },
            { root: "sql", spine: ["sql", "ar"] },
          ],
        },
      ],
    };

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    const flow = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });
    const edges = flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`);

    expect(edges).toContain("modelo->__join__out__modelo");
    expect(edges).not.toContain("norm->__join__in__sql");
    expect(edges).not.toContain("norm->sql");

    const forkJunction = flow.nodes.find((n) => n.id === "__join__out__modelo");
    expect(forkJunction?.position.x).toBeCloseTo(0, 0);
  });

  it("centers junctions when fork opens after modelo into two multi-row lanes", () => {
    const curation: RoadmapCuration = {
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
          mergeInto: "alg",
          lanes: [
            { root: "norm", spine: ["norm", "acid"] },
            { root: "sql", spine: ["sql", "ar"] },
          ],
        },
      ],
    };

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    const normCx = layout.placements.get("norm")!.x + layout.placements.get("norm")!.width / 2;
    const sqlCx = layout.placements.get("sql")!.x + layout.placements.get("sql")!.width / 2;
    const mid = (normCx + sqlCx) / 2;

    const junctions = junctionXs(layout, titles);
    for (const [id, x] of Object.entries(junctions)) {
      expect(x, id).toBeCloseTo(mid, 0);
      expect(x, id).toBeCloseTo(0, 0);
    }
  });
});
