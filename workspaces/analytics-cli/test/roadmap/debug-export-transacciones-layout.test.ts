import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import { shiftConceptInOrder } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const beforeShift: RoadmapCuration = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [{ root: "modelo entidad-relación", spine: ["modelo entidad-relación"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkForks: [
    {
      after: "modelo entidad-relación",
      mergeInto: "álgebra relacional",
      lanes: [
        { root: "normalización", spine: ["normalización"] },
        { root: "sql", spine: ["sql"] },
      ],
    },
    {
      after: "álgebra relacional",
      mergeInto: "ACID",
      lanes: [
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
        { root: "transacciones", spine: ["transacciones"] },
      ],
    },
  ],
  trunkSpine: ["modelo entidad-relación", "álgebra relacional", "ACID"],
};

const titles = [
  "modelo entidad-relación",
  "normalización",
  "sql",
  "álgebra relacional",
  "transacciones",
  "ACID",
];

function roadmap(): DegreeRoadmap {
  return {
    degree: "LDS",
    degreeSlug: "lds",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

describe("debug export: subir transacciones (two steps)", () => {
  it("keeps two forks with two lanes each after passing álgebra then sql", () => {
    const step1 = shiftConceptInOrder(beforeShift, "transacciones", -1);
    const afterShift = shiftConceptInOrder(step1!, "transacciones", -1);
    expect(afterShift).not.toBeNull();
    expect(curationSatisfiesInvariants(afterShift!)).toBe(true);
    expect(afterShift!.trunkForks).toHaveLength(2);
    expect(afterShift!.trunkForks![1]!.lanes).toHaveLength(2);
    expect(afterShift!.trunkSpine).toEqual(beforeShift.trunkSpine);
    expect(afterShift!.trunkForks![0]!.lanes.map((lane) => lane.spine)).toEqual([
      ["normalización"],
      ["transacciones"],
    ]);
    expect(afterShift!.trunkForks![1]!.lanes.map((lane) => lane.spine)).toEqual([
      ["sql"],
      ["álgebra relacional"],
    ]);

    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), afterShift!);
    const flow = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });

    for (const title of titles) {
      expect(layout.placements.has(title), title).toBe(true);
    }

    const joinOutIds = flow.nodes
      .filter((n) => String(n.id).startsWith("__join__out__"))
      .map((n) => n.id);
    expect(joinOutIds.length).toBeGreaterThanOrEqual(2);
  });
});
