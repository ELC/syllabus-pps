import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

/** User export: ACID|trans separate before sql|ár; álgebra still on trunk. */
const acidTransBeforeMidFork = {
  degreeSlug: "bases-de-datos",
  parallelLanes: [{ root: "modelo entidad-relación", spine: ["modelo entidad-relación"] }],
  postMergeSpine: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: ["transacciones", "ACID", "álgebra relacional", "normalización"],
  trunkSpine: [
    "modelo entidad-relación",
    "sql",
    "álgebra relacional",
    "ACID",
    "transacciones",
  ],
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

function laneBandHeight(
  layout: ReturnType<typeof buildRoadmapLayout>,
  titles: readonly string[],
): number {
  const boxes = titles
    .map((title) => layout.placements.get(title))
    .filter((placement): placement is NonNullable<typeof placement> => placement !== undefined);
  if (boxes.length === 0) {
    return 0;
  }

  const minY = Math.min(...boxes.map((box) => box.y));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  return maxY - minY;
}

describe("tail fork lane placement", () => {
  it("keeps ACID|trans row compact when lanes open at transacciones", () => {
    const rm = roadmap();
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), acidTransBeforeMidFork);

    const headBand = laneBandHeight(layout, ["modelo entidad-relación", "normalización"]);
    const tailBand = laneBandHeight(layout, ["ACID", "transacciones"]);
    expect(headBand).toBeGreaterThan(0);
    expect(tailBand).toBeGreaterThan(0);
    expect(tailBand, `head=${headBand} tail=${tailBand}`).toBeLessThanOrEqual(headBand + 40);
  });
});
