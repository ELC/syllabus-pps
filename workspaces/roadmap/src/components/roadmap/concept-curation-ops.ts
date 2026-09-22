import type { RoadmapAdjacency } from "./adjacency";
import type { RoadmapCuration, RoadmapTrunkFork } from "./curation";
import { Admissibility } from "../../concept-graph";
import { EditErrorCode } from "../../concept-graph/errors";
import { branchOwnerForConcept as branchOwnerFromSubgraph } from "../../concept-graph/editor/lateral";
import { decodeCuration } from "../../concept-graph";

export type {
  ConceptCurationOpError,
  ConceptCurationOpResult,
} from "./concept-curation-op-types";

export {
  attachConceptAsBranch,
  mergeImplicitLayoutBranches,
} from "./concept-curation";
export { sanitizeTrunkForkCuration } from "./concept-curation-sanitize";

export {
  attachSideConcept,
  canShiftConceptInOrder,
  mergeTrunkFork,
  promoteConceptToSpine,
  separateSpineRangeToBranches,
  shiftConceptInOrder,
  swapConceptOrder,
} from "./concept-curation-graph-ops";

import {
  canShiftConceptInOrder,
  shiftConceptInOrder,
} from "./concept-curation-graph-ops";
import type { ConceptCurationOpError } from "./concept-curation-op-types";

export function branchOwnerForConcept(
  curation: RoadmapCuration,
  title: string,
): string | undefined {
  if (curation.branchOwnerOverrides[title]) {
    return curation.branchOwnerOverrides[title];
  }

  for (const [owner, branches] of Object.entries(curation.branches)) {
    if (branches.includes(title)) {
      return owner;
    }
  }

  const decoded = decodeCuration(curation);
  if (decoded.outcome !== "decoded") {
    return undefined;
  }

  return branchOwnerFromSubgraph(decoded.subgraph, title);
}

export function findTrunkForkForConcept(
  curation: RoadmapCuration,
  title: string,
): RoadmapTrunkFork | undefined {
  const forks = curation.trunkForks ?? [];
  const byAnchor = forks.find((fork) => fork.after === title);
  if (byAnchor) {
    return byAnchor;
  }

  for (const fork of forks) {
    if (fork.lanes.some((lane) => lane.spine.includes(title))) {
      return fork;
    }
  }

  return undefined;
}

export function inferLayoutBranchOwner(
  title: string,
  adjacency: RoadmapAdjacency,
  stageOf: ReadonlyMap<string, number>,
): string | undefined {
  const prerequisites = adjacency.prerequisites.get(title);
  if (!prerequisites || prerequisites.size === 0) {
    return undefined;
  }

  const [owner] = [...prerequisites].sort(
    (left, right) =>
      (stageOf.get(right) ?? 0) - (stageOf.get(left) ?? 0) ||
      left.localeCompare(right, "es-AR"),
  );

  return owner;
}

export type ShiftPlan =
  | { readonly admissibility: typeof Admissibility.Allowed; readonly curation: RoadmapCuration }
  | { readonly admissibility: typeof Admissibility.Blocked; readonly error: ConceptCurationOpError };

/** Typed shift plan: admissibility discriminant replaces boolean guards. */
export function planShiftOnCuration(
  curation: RoadmapCuration,
  title: string,
  direction: -1 | 1,
): ShiftPlan {
  if (!canShiftConceptInOrder(curation, title, direction)) {
    return { admissibility: Admissibility.Blocked, error: EditErrorCode.ShiftNoNeighbor };
  }

  const next = shiftConceptInOrder(curation, title, direction);
  if (!next) {
    return {
      admissibility: Admissibility.Blocked,
      error: EditErrorCode.ShiftCrossForkBlocked,
    };
  }

  return { admissibility: Admissibility.Allowed, curation: next };
}
