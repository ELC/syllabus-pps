import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID } from "../../../roadmap/src/components/roadmap/constants";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const headTailMiddle = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [{ root: "modelo entidad-relación", spine: ["modelo entidad-relación"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkSpine: ["modelo entidad-relación", "sql", "álgebra relacional", "transacciones"],
  trunkForks: [
    {
      after: "modelo entidad-relación",
      mergeInto: "sql",
      lanes: [
        { root: "modelo entidad-relación", spine: ["modelo entidad-relación"] },
        { root: "normalización", spine: ["normalización"] },
      ],
    },
    {
      after: "álgebra relacional",
      mergeInto: "transacciones",
      lanes: [
        { root: "ACID", spine: ["ACID"] },
        { root: "transacciones", spine: ["transacciones"] },
      ],
    },
    {
      after: "sql",
      mergeInto: "álgebra relacional",
      lanes: [
        { root: "sql", spine: ["sql"] },
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
      ],
    },
  ],
} satisfies RoadmapCuration;

function roadmap(): DegreeRoadmap {
  const titles = [
    "modelo entidad-relación",
    "normalización",
    "sql",
    "álgebra relacional",
    "ACID",
    "transacciones",
  ];
  return {
    degree: "LDS",
    degreeSlug: "lds",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

describe("head + tail fork, then middle separate sql|álgebra", () => {
  it("satisfies invariants and connects every topic to objetivo", () => {
    expect(curationSatisfiesInvariants(headTailMiddle)).toBe(true);

    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), headTailMiddle);
    const flow = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });

    for (const title of rm.concepts.map((c) => c.title)) {
      expect(layout.placements.has(title), title).toBe(true);
    }

    const edges = flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`);

    expect(edges.some((e) => e.endsWith(`->${ROADMAP_END_ID}`)), edges.join("\n")).toBe(true);

    const dangling = rm.concepts
      .map((c) => c.title)
      .filter(
        (title) =>
          !edges.some((edge) => edge.startsWith(`${title}->`) || edge.endsWith(`->${title}`)),
      );
    expect(dangling, edges.join("\n")).toEqual([]);

    expect(edges).not.toContain("sql->álgebra relacional");
    expect(edges.some((e) => e.includes("__join__in__álgebra relacional"))).toBe(true);
    expect(edges.join("\n"), edges.join("\n")).toContain("__join__in__transacciones");
  });
});
