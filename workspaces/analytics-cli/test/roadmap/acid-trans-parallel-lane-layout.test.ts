import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID } from "../../../roadmap/src/components/roadmap/constants";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const parallelLaneBefore = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [
    {
      root: "modelo entidad-relación",
      spine: [
        "modelo entidad-relación",
        "sql",
        "álgebra relacional",
        "ACID",
        "transacciones",
      ],
    },
  ],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkForks: [
    {
      after: "modelo entidad-relación",
      mergeInto: "sql",
      lanes: [
        { root: "modelo entidad-relación", spine: ["modelo entidad-relación"] },
        { root: "normalización", spine: ["normalización"] },
      ],
    },
  ],
} satisfies RoadmapCuration;

/** User export after separate from parallel-only spine. */
const userAfterSeparate = {
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
  ],
  trunkSpine: ["modelo entidad-relación", "sql", "álgebra relacional", "transacciones"],
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

function spineEdges(curation: RoadmapCuration) {
  const rm = roadmap();
  const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
  const flow = buildRoadmapFlow({
    roadmap: rm,
    adjacency: buildAdjacency(rm),
    layout,
    isTopicDone: () => false,
  });
  return {
    layout,
    edges: flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`),
    joinNodes: flow.nodes.filter((n) => String(n.id).includes("__join__")).map((n) => n.id),
  };
}

describe("ACID|trans from parallel-only spine", () => {
  it("separate uses ACID as tail fork anchor when spine lived in parallel lane", () => {
    const result = separateSpineRangeToBranches(parallelLaneBefore, "ACID", "transacciones");
    expect(result.ok, result.ok ? "" : JSON.stringify(result)).toBe(true);
    if (!result.ok) {
      return;
    }
    const tail = result.curation.trunkForks!.find((f) => f.mergeInto === "transacciones");
    expect(tail?.after).toBe("ACID");
  });

  it("draws merge junction and lane edges for tail fork after álgebra (legacy shape)", () => {
    expect(curationSatisfiesInvariants(userAfterSeparate)).toBe(true);
    const { edges, joinNodes, layout } = spineEdges(userAfterSeparate);

    for (const title of roadmap().concepts.map((c) => c.title)) {
      expect(layout.placements.has(title), title).toBe(true);
    }

    if (!joinNodes.some((id) => id.includes("__join__in__transacciones"))) {
      throw new Error(`${edges.sort().join("\n")}\njoins=${joinNodes.join(",")}`);
    }
    expect(edges).toContain("ACID->__join__in__transacciones");
    expect(edges).toContain("transacciones->__join__in__transacciones");
    expect(edges).toContain("__join__in__transacciones->__roadmap_end__");
    expect(edges).not.toContain("ACID->transacciones");
    expect(edges.some((e) => e.endsWith(`->${ROADMAP_END_ID}`))).toBe(true);
  });
});
