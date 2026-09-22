import { describe, expect, it } from "vitest";

import type { DegreeRoadmap } from "@pps/core";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_START_ID } from "../../../roadmap/src/components/roadmap/constants";
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

function boxCenterX(layout: ReturnType<typeof buildRoadmapLayout>, id: string): number {
  const start = layout.start;
  if (id === ROADMAP_START_ID) {
    return start.x + 184 / 2;
  }
  const p = layout.placements.get(id)!;
  return p.x + p.width / 2;
}

describe("junction center debug", () => {
  it("head fork only: inicio fan-out and merge junction sit between lane centers", () => {
    const titles = ["modelo", "norm", "sql", "ar", "alg"];
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
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
      ],
    };

    const roadmap = linearRoadmap(titles);
    const layout = buildRoadmapLayout(roadmap, buildAdjacency(roadmap), curation);
    expect(layout.trunk[0]).toBe("modelo");
    expect(layout.trunkForks[0]?.after).toBe("modelo");
    const flow = buildRoadmapFlow({
      roadmap,
      adjacency: buildAdjacency(roadmap),
      layout,
      isTopicDone: () => false,
    });

    const modeloCx = boxCenterX(layout, "modelo");
    const normCx = boxCenterX(layout, "norm");
    const mid = (modeloCx + normCx) / 2;

    const spineEdges = flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`);

    expect(spineEdges).toMatchInlineSnapshot(`
      [
        "__roadmap_start__->__join__out____roadmap_start__",
        "__join__out____roadmap_start__->modelo",
        "__join__out____roadmap_start__->norm",
        "modelo->__join__in__sql",
        "norm->__join__in__sql",
        "__join__in__sql->sql",
        "sql->ar",
        "ar->alg",
        "alg->__roadmap_end__",
      ]
    `);

    const inicioOut = flow.nodes.find((n) => n.id === `__join__out__${ROADMAP_START_ID}`);
    const mergeSql = flow.nodes.find((n) => n.id === "__join__in__sql");
    expect(inicioOut?.position.x).toBeCloseTo(mid, 0);
    expect(mergeSql?.position.x).toBeCloseTo(mid, 0);
  });

  it("nested fork: all merge junctions sit between their source lane centers", () => {
    const titles = ["modelo", "norm", "sql", "ar", "alg"];
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

    const separated = separateSpineRangeToBranches(curation, "sql", "ar");
    expect(separated.ok).toBe(true);
    if (!separated.ok) {
      return;
    }

    const roadmap = linearRoadmap(titles);
    const layout = buildRoadmapLayout(roadmap, buildAdjacency(roadmap), separated.curation);
    const flow = buildRoadmapFlow({
      roadmap,
      adjacency: buildAdjacency(roadmap),
      layout,
      isTopicDone: () => false,
    });

    const splitSql = flow.nodes.find((n) => n.id === "__join__out____join__in__sql");
    expect(splitSql?.position.x).toBeCloseTo(0, 0);
  });
});
