import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID } from "../../../roadmap/src/components/roadmap/constants";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const afterSeparate = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [{ root: "modelo entidad-relación", spine: ["modelo entidad-relación"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkSpine: ["modelo entidad-relación", "sql", "ACID", "transacciones"],
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
      after: "sql",
      mergeInto: "ACID",
      lanes: [
        { root: "sql", spine: ["sql"] },
        { root: "álgebra relacional", spine: ["álgebra relacional"] },
      ],
    },
    {
      after: "ACID",
      mergeInto: "transacciones",
      lanes: [
        { root: "ACID", spine: ["ACID"] },
        { root: "transacciones", spine: ["transacciones"] },
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

const twoForksOnly = {
  ...afterSeparate,
  trunkForks: afterSeparate.trunkForks.slice(0, 2),
} satisfies RoadmapCuration;

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
    edges: flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`),
    joinNodes: flow.nodes
      .filter((n) => String(n.id).includes("__join__"))
      .map((n) => n.id)
      .sort(),
  };
}

describe("layout after ACID|transacciones separate (three forks)", () => {
  it("does not change head fork junctions when the tail fork is added", () => {
    const rm = roadmap();
    const layout2 = buildRoadmapLayout(rm, buildAdjacency(rm), twoForksOnly);
    const layout3 = buildRoadmapLayout(rm, buildAdjacency(rm), afterSeparate);
    expect(layout3.trunkForks[0]).toEqual(layout2.trunkForks[0]);
    expect(layout3.trunk).toEqual(layout2.trunk);
    expect(layout3.lateJoins).toEqual(layout2.lateJoins);
    expect(layout3.parallelLanes).toEqual(layout2.parallelLanes);

    const before = spineEdges(twoForksOnly);
    const after = spineEdges(afterSeparate);
    const headEdgePrefix = (e: string) =>
      e.includes("modelo entidad-relación") ||
      e.includes("normalización") ||
      e.includes("__join__in__sql") ||
      e.includes("__join__out____roadmap_start__") ||
      e.startsWith("__roadmap_start__");
    const headBefore = before.edges.filter(headEdgePrefix).sort();
    const headAfter = after.edges.filter(headEdgePrefix).sort();
    expect(headAfter, headAfter.join("\n")).toEqual(headBefore);

    const headJoinBefore = before.joinNodes.filter(
      (id) => id.includes("sql") || id.includes("roadmap_start"),
    );
    const headJoinAfter = after.joinNodes.filter(
      (id) => id.includes("sql") || id.includes("roadmap_start"),
    );
    expect(headJoinAfter).toEqual(headJoinBefore);
  });

  it("satisfies invariants and connects every topic to objetivo", () => {
    expect(curationSatisfiesInvariants(afterSeparate)).toBe(true);

    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), afterSeparate);
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

    expect(edges.some((edge) => edge.endsWith(`->${ROADMAP_END_ID}`)), edges.join("\n")).toBe(
      true,
    );

    const spineTopics = rm.concepts.map((c) => c.title);
    const dangling = spineTopics.filter(
      (title) =>
        !edges.some(
          (edge) => edge.startsWith(`${title}->`) || edge.endsWith(`->${title}`),
        ),
    );
    expect(dangling, edges.join("\n")).toEqual([]);

    expect(edges, edges.join("\n")).toContain("__join__in__ACID->__join__out____join__in__ACID");
    expect(edges, edges.join("\n")).toContain("__join__out____join__in__ACID->ACID");
    expect(edges, edges.join("\n")).toContain("__join__out____join__in__ACID->transacciones");
    expect(edges, edges.join("\n")).toContain("ACID->__join__in__transacciones");
    expect(edges, edges.join("\n")).toContain("transacciones->__join__in__transacciones");
    expect(edges, edges.join("\n")).toContain("__join__in__transacciones->__roadmap_end__");
    expect(edges).not.toContain("__join__in__transacciones->transacciones");
    expect(edges).not.toContain("__join__in__ACID->ACID");
    expect(edges).not.toContain("ACID->transacciones");
    expect(edges).not.toContain("__join__in__ACID->transacciones");

    expect(edges).not.toContain("transacciones->__join__out__transacciones");
    expect(edges).not.toContain("__join__out__transacciones->__roadmap_end__");
    expect(edges).not.toContain("transacciones->__roadmap_end__");
    expect(
      flow.nodes.filter((n) => String(n.id).startsWith("__join__out__transacciones")),
    ).toHaveLength(0);
  });
});
