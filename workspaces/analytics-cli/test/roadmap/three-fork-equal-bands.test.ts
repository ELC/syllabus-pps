import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import { shiftConceptInOrder } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

const threeForks = {
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

function forkBandMetrics(
  layout: ReturnType<typeof buildRoadmapLayout>,
  laneTitles: readonly [string, string],
) {
  const left = layout.placements.get(laneTitles[0]);
  const right = layout.placements.get(laneTitles[1]);
  expect(left, laneTitles[0]).toBeDefined();
  expect(right, laneTitles[1]).toBeDefined();
  const bandTop = Math.min(left!.y, right!.y);
  const bandBottom = Math.max(left!.y + left!.height, right!.y + right!.height);
  const centerDelta = Math.abs(left!.y + left!.height / 2 - (right!.y + right!.height / 2));
  return { height: bandBottom - bandTop, centerDelta };
}

describe("three-fork band layout (LDS bases de datos)", () => {
  it("uses equal lane band height and aligned lane centers before subir", () => {
    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), threeForks);
    const head = forkBandMetrics(layout, ["modelo entidad-relación", "normalización"]);
    const mid = forkBandMetrics(layout, ["sql", "álgebra relacional"]);
    const tail = forkBandMetrics(layout, ["ACID", "transacciones"]);

    expect(head.centerDelta).toBe(0);
    expect(mid.centerDelta).toBe(0);
    expect(tail.centerDelta).toBe(0);
    expect(head.height).toBe(mid.height);
    expect(mid.height).toBe(tail.height);
  });

  it("keeps sql and tail fork bands separate after subir transacciones", () => {
    const afterSubir = shiftConceptInOrder(threeForks, "transacciones", -1)!;
    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), afterSubir);
    const flow = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });

    const mid = forkBandMetrics(layout, ["sql", "álgebra relacional"]);
    const tail = forkBandMetrics(layout, ["transacciones", "ACID"]);
    expect(mid.centerDelta).toBe(0);
    expect(tail.centerDelta).toBe(0);
    expect(mid.height).toBe(tail.height);

    const midBottom = Math.max(
      layout.placements.get("sql")!.y + layout.placements.get("sql")!.height,
      layout.placements.get("álgebra relacional")!.y +
        layout.placements.get("álgebra relacional")!.height,
    );
    const tailTop = Math.min(
      layout.placements.get("transacciones")!.y,
      layout.placements.get("ACID")!.y,
    );
    expect(tailTop).toBeGreaterThan(midBottom);

    const edges = flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`);
    expect(edges).not.toContain("__join__out__sql->transacciones");
    expect(edges).not.toContain("__join__out__sql->ACID");
  });
});
