import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_START_ID } from "../../../roadmap/src/components/roadmap/constants";
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

describe("inicio head fork then sql|ar row", () => {
  it("centers merge junctions and avoids lane-root shortcuts on the left column", () => {
    const titles = ["modelo", "norm", "sql", "ar", "alg", "trans"];
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: titles }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [],
    };

    const head = separateSpineRangeToBranches(curation, "modelo", "norm");
    expect(head.ok).toBe(true);
    if (!head.ok) {
      return;
    }

    const split = separateSpineRangeToBranches(head.curation, "sql", "ar");
    expect(split.ok).toBe(true);
    if (!split.ok) {
      return;
    }

    curation = split.curation;
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

    expect(edges).not.toContain("modelo->sql");
    expect(edges).not.toContain("norm->sql");
    expect(edges).not.toContain("modelo->norm");

    for (const node of flow.nodes.filter((n) => String(n.id).startsWith("__join__"))) {
      expect(node.position.x, String(node.id)).toBeCloseTo(0, 0);
    }

    expect(edges.some((e) => e.includes(`__join__out__${ROADMAP_START_ID}`))).toBe(true);
    expect(edges.some((e) => e.includes("__join__in__sql"))).toBe(true);
    expect(edges).toContain("__join__in__sql->__join__out____join__in__sql");
    expect(edges).toContain("__join__out____join__in__sql->sql");
    expect(edges).toContain("__join__out____join__in__sql->ar");
  });

  it("splits sql|ar without dropping a tail fork that opens on ar", () => {
    const titles = ["modelo", "norm", "sql", "ar", "acid", "trans"];
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: titles }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [],
    };

    curation = separateSpineRangeToBranches(curation, "modelo", "norm").curation!;
    curation = separateSpineRangeToBranches(curation, "acid", "trans").curation!;
    const mid = separateSpineRangeToBranches(curation, "sql", "ar");
    expect(mid.ok, mid.ok ? "" : JSON.stringify(mid)).toBe(true);
    if (!mid.ok) {
      return;
    }
    curation = mid.curation;

    expect(curation.trunkForks).toHaveLength(3);
    expect(curation.trunkForks!.find((fork) => fork.after === "sql")).toMatchObject({
      mergeInto: "ar",
    });
    expect(curation.trunkForks!.find((fork) => fork.after === "ar")).toMatchObject({
      mergeInto: "trans",
    });

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    const flow = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });
    for (const title of titles) {
      expect(layout.placements.has(title), title).toBe(true);
    }

    const edges = flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`);
    expect(edges).not.toContain("sql->ar");
    expect(edges).toContain("sql->__join__in__ar");
    expect(edges).toContain("ar->__join__in__ar");
    expect(edges).toContain("__join__in__ar->ar");
  });
});
