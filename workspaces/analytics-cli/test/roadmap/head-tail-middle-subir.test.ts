import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import {
  separateSpineRangeToBranches,
  shiftConceptInOrder,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";

function roadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

function spineEdges(curation: RoadmapCuration, titles: string[]): string[] {
  const rm = roadmap(titles);
  const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
  const flow = buildRoadmapFlow({
    roadmap: rm,
    adjacency: buildAdjacency(rm),
    layout,
    isTopicDone: () => false,
  });
  return flow.edges
    .filter((e) => e.className?.includes("roadmap__edge--spine"))
    .map((e) => `${e.source}->${e.target}`)
    .sort();
}

describe("head tail middle then subir acid", () => {
  const titles = ["modelo", "norm", "sql", "ar", "acid", "trans"];

  it("keeps clean spine edges after shifting acid above ar", () => {
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
    curation = separateSpineRangeToBranches(curation, "sql", "ar").curation!;

    const shifted = shiftConceptInOrder(curation, "acid", -1);
    expect(shifted).not.toBeNull();
    expect(shifted?.trunkSpine).toEqual(["modelo", "sql", "ar", "trans"]);
    expect(shifted?.trunkForks).toHaveLength(3);
    expect(shifted?.trunkForks!.find((fork) => fork.after === "ar")).toMatchObject({
      mergeInto: "trans",
      lanes: [{ spine: ["trans"] }],
    });
    expect(shifted?.trunkForks!.find((fork) => fork.after === "sql")).toMatchObject({
      mergeInto: "ar",
      lanes: [{ spine: ["sql"] }, { spine: ["acid", "ar"] }],
    });

    const edges = spineEdges(shifted!, titles);
    expect(edges).not.toContain("sql->ar");
    expect(edges).not.toContain("ar->acid");
    expect(edges.filter((edge) => edge.startsWith("acid->")).length).toBeLessThanOrEqual(2);
    expect(edges.some((edge) => edge.includes("__join__in__ar"))).toBe(true);
    for (const title of titles) {
      const rm = roadmap(titles);
      const layout = buildRoadmapLayout(rm, buildAdjacency(rm), shifted!);
      expect(layout.placements.has(title), title).toBe(true);
    }
  });
});
