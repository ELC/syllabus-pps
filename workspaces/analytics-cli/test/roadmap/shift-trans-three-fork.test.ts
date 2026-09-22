import { describe, expect, it } from "vitest";

import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import {
  canShiftConceptInOrder,
  planShiftOnCuration,
  shiftConceptInOrder,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import {
  buildExpandedSpineOrderForTest,
  shiftTailMergeTargetUpForTest,
} from "../../../roadmap/src/components/roadmap/concept-curation-legacy";

const curation = {
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

describe("subir transacciones (three-fork LDS)", () => {
  it("moves transacciones above ACID on trunk and in tail fork lanes", () => {
    expect(
      curation.trunkForks!.find(
        (fork) => fork.after === "ACID" && fork.mergeInto === "transacciones",
      ),
    ).toBeDefined();

    const expanded = buildExpandedSpineOrderForTest(curation);
    const transIdx = expanded.indexOf("transacciones");
    expect(expanded[transIdx - 1]).toBe("ACID");
    expect(shiftTailMergeTargetUpForTest(curation, "transacciones", "ACID")).not.toBeNull();

    expect(canShiftConceptInOrder(curation, "transacciones", -1)).toBe(true);

    const planned = planShiftOnCuration(curation, "transacciones", -1);
    expect(planned.admissibility, planned.admissibility === "blocked" ? planned.error : "").toBe(
      "allowed",
    );
    if (planned.admissibility !== "allowed") {
      return;
    }

    expect(planned.curation.trunkSpine).not.toEqual(curation.trunkSpine);
    expect(planned.curation.trunkSpine).toEqual([
      "modelo entidad-relación",
      "sql",
      "transacciones",
      "ACID",
    ]);

    const shifted = shiftConceptInOrder(curation, "transacciones", -1);
    expect(shifted?.trunkSpine).toEqual([
      "modelo entidad-relación",
      "sql",
      "transacciones",
      "ACID",
    ]);
    expect(shifted?.trunkForks).toHaveLength(3);
    expect(shifted?.trunkForks!.find((fork) => fork.after === "transacciones")?.mergeInto).toBe(
      "ACID",
    );

    const sqlAlgebraFork = shifted?.trunkForks!.find((fork) =>
      fork.lanes.some((lane) => lane.spine.includes("álgebra relacional")),
    );
    expect(sqlAlgebraFork).toMatchObject({ after: "sql", mergeInto: "ACID" });
  });
});
