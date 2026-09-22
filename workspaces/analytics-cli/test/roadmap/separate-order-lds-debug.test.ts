import { describe, expect, it } from "vitest";

import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

describe("LDS separate order (user-reported)", () => {
  const headOnly: RoadmapCuration = {
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
    ],
  };

  it("ACID|trans before sql|álgebra should fork after ACID, not after álgebra", () => {
    const result = separateSpineRangeToBranches(headOnly, "ACID", "transacciones");
    expect(result.ok, result.ok ? "" : JSON.stringify(result)).toBe(true);
    if (!result.ok) {
      return;
    }

    const tail = result.curation.trunkForks!.find((f) => f.mergeInto === "transacciones");
    expect(tail?.after).toBe("ACID");
    expect(tail?.lanes.map((l) => l.spine)).toEqual([["ACID"], ["transacciones"]]);
    expect(result.curation.trunkSpine).toEqual([
      "modelo entidad-relación",
      "sql",
      "álgebra relacional",
      "ACID",
      "transacciones",
    ]);
  });

  it("recommends sql|álgebra before ACID|trans (mid fork merges at ACID when tail exists first)", () => {
    const acidTrans = separateSpineRangeToBranches(headOnly, "ACID", "transacciones");
    expect(acidTrans.ok).toBe(true);
    if (!acidTrans.ok) {
      return;
    }

    const sqlAlg = separateSpineRangeToBranches(
      acidTrans.curation,
      "sql",
      "álgebra relacional",
    );
    expect(sqlAlg.ok, sqlAlg.ok ? "" : JSON.stringify(sqlAlg)).toBe(true);
    if (!sqlAlg.ok) {
      return;
    }

    const mid = sqlAlg.curation.trunkForks!.find((f) => f.after === "sql");
    expect(mid?.mergeInto).toBe("ACID");
  });

});
