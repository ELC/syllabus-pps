import type { RoadmapCuration } from "../../components/roadmap/curation";
import { EditErrorCode, type EditError } from "../errors";
import type { ConceptSubgraph } from "../subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import type { TrunkSpineField } from "../subgraph";
import { readCompressedTrunkTitles, readStorageMode } from "./compressed-trunk";
import { decodeLinearSpineToPath } from "./decode-lane";

function readTrunkSpineField(curation: RoadmapCuration): TrunkSpineField {
  if (curation.trunkSpine === undefined) {
    return "absent";
  }

  if (curation.trunkSpine.length === 0) {
    return "empty";
  }

  return "titles";
}

function spineSourceForDecode(curation: RoadmapCuration): string[] {
  const trunkTitles = readCompressedTrunkTitles(curation);
  const spine =
    trunkTitles.length > 0
      ? [...trunkTitles]
      : [...(curation.parallelLanes[0]?.spine ?? [])];

  for (const fork of curation.trunkForks ?? []) {
    if (!spine.includes(fork.after)) {
      continue;
    }

    if (spine.includes(fork.mergeInto)) {
      continue;
    }

    const afterIdx = spine.indexOf(fork.after);
    spine.splice(afterIdx + 1, 0, fork.mergeInto);
  }

  return spine;
}

export type DecodeOutcome =
  | { readonly outcome: "decoded"; readonly subgraph: ValidatedConceptSubgraph }
  | { readonly outcome: "failed"; readonly error: EditError };

export function decodeCuration(curation: RoadmapCuration): DecodeOutcome {
  const forks = curation.trunkForks ?? [];
  const spineSource = spineSourceForDecode(curation);

  if (spineSource.length === 0 && curation.parallelLanes.length === 0) {
    return {
      outcome: "failed",
      error: { code: EditErrorCode.CodecInvalidCuration },
    };
  }

  const trunk = decodeLinearSpineToPath(spineSource, forks);

  const laterals: Record<string, string[]> = {};
  for (const [owner, branches] of Object.entries(curation.branches)) {
    if (branches.length > 0) {
      laterals[owner] = [...branches];
    }
  }

  const subgraph: ConceptSubgraph = {
    degreeSlug: curation.degreeSlug,
    trunk,
    laterals,
    meta: {
      storageMode: readStorageMode(curation),
      trunkSpineField: readTrunkSpineField(curation),
      parallelLaneRoot: curation.parallelLanes[0]?.root ?? spineSource[0] ?? "",
      spinePromotions: [...(curation.spinePromotions ?? [])],
      branchLayoutFlips: { ...(curation.branchLayoutFlips ?? {}) },
      spineJoins: { ...curation.spineJoins },
      branchOwnerOverrides: { ...curation.branchOwnerOverrides },
      trunkForks: forks.length > 0 ? forks.map((fork) => structuredClone(fork)) : undefined,
    },
  };

  return { outcome: "decoded", subgraph: markValidated(subgraph, { skipInvariantCheck: true }) };
}
