import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import {
  ROADMAP_END_ID,
  SPINE_NODE_WIDTH,
} from "../../../roadmap/src/components/roadmap/constants";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import { shiftConceptInOrder } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { curationSatisfiesInvariants } from "../../../roadmap/src/concept-graph/invariants";

const beforeSubir = {
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
      after: "ACID",
      mergeInto: "transacciones",
      lanes: [
        { root: "ACID", spine: ["ACID"] },
        { root: "transacciones", spine: ["transacciones"] },
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

function spineEdges(curation: RoadmapCuration) {
  const rm = roadmap();
  const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
  const flow = buildRoadmapFlow({
    roadmap: rm,
    adjacency: buildAdjacency(rm),
    layout,
    isTopicDone: () => false,
  });
  return flow.edges
    .filter((e) => e.className?.includes("roadmap__edge--spine"))
    .map((e) => `${e.source}->${e.target}`);
}

describe("layout after subir transacciones (three-fork LDS)", () => {
  it("connects every topic and routes tail merge through ACID junction", () => {
    const afterSubir = shiftConceptInOrder(beforeSubir, "transacciones", -1);
    expect(afterSubir).not.toBeNull();
    expect(curationSatisfiesInvariants(afterSubir!)).toBe(true);

    const edges = spineEdges(afterSubir!);
    const topics = roadmap().concepts.map((c) => c.title);
    const dangling = topics.filter(
      (title) =>
        !edges.some((edge) => edge.startsWith(`${title}->`) || edge.endsWith(`->${title}`)),
    );
    expect(dangling, edges.sort().join("\n")).toEqual([]);

    expect(edges.some((e) => e.endsWith(`->${ROADMAP_END_ID}`)), edges.join("\n")).toBe(true);
    expect(edges, edges.join("\n")).toContain("transacciones->__join__in__ACID");
    expect(edges, edges.join("\n")).toContain("álgebra relacional->__join__in__ACID");
    expect(
      edges.some(
        (edge) =>
          edge === "__join__in__ACID->__roadmap_end__" ||
          edge === "ACID->__roadmap_end__" ||
          edge === "__join__in__ACID->ACID",
      ),
      edges.join("\n"),
    ).toBe(true);
    expect(edges, edges.join("\n")).toContain("sql->transacciones");
    expect(edges).not.toContain("__join__out__sql->transacciones");
    expect(edges).not.toContain("__join__out__sql->ACID");
    expect(edges).not.toContain("ACID->transacciones");
    expect(edges).not.toContain("álgebra relacional->ACID");
    expect(edges).not.toContain("transacciones->__roadmap_end__");
    expect(edges).not.toContain("ACID->__join__in__transacciones");

    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), afterSubir!);
    expect(layout.placements.get("transacciones")?.role).toBe("spine");
    expect(layout.placements.has("ACID")).toBe(true);

    const trans = layout.placements.get("transacciones")!;
    expect(trans.x).toBe(-SPINE_NODE_WIDTH / 2);
    const acid = layout.placements.get("ACID")!;
    expect(Math.abs(trans.y + trans.height / 2 - (acid.y + acid.height / 2))).toBeLessThan(1);
    expect(trans.y).toBeGreaterThan(layout.placements.get("sql")!.y);
  });
});
