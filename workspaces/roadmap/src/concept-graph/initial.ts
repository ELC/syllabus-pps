import { StorageMode } from "./kinds";
import { conceptSegment, type SpinePath } from "./segment";
import type { ConceptSubgraph } from "./subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "./validated";

export function initialSubgraphFromTitles(
  degreeSlug: string,
  titles: readonly string[],
): ValidatedConceptSubgraph {
  const trunk: SpinePath = titles.map((title) => conceptSegment(title));
  const subgraph: ConceptSubgraph = {
    degreeSlug,
    trunk,
    laterals: {},
    meta: {
      storageMode: StorageMode.ParallelOnly,
      trunkSpineField: "absent",
      parallelLaneRoot: titles[0] ?? "",
      spinePromotions: [],
      branchLayoutFlips: {},
      capstones: [],
      spineJoins: {},
      branchOwnerOverrides: {},
    },
  };

  return markValidated(subgraph);
}
