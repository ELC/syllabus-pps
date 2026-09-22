import { EditErrorCode } from "../errors";
import { Admissibility, EditCommandKind } from "../kinds";
import { separateSpineRangeToBranches } from "../../components/roadmap/concept-curation-legacy";
import type { ConceptCurationOpError } from "../../components/roadmap/concept-curation-op-types";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { allowed, blocked, type SeparateAdmissibility } from "./admissibility";
import type { SeparateCommand } from "./commands";
import { curationsStructurallyEqual } from "./curation-snapshot";
import { curationInput, subgraphAfterCuration } from "./curation-mutate";
import { applySeparateNative, planSeparateNative } from "./separate-native";
import { encodeSubgraph } from "../codec/encode";
import { sanitizeTrunkForkCuration } from "../../components/roadmap/concept-curation-sanitize";

const LEGACY_SEPARATE_ERRORS = new Set<string>([
  EditErrorCode.NoBranchOwner,
  EditErrorCode.NoSpineAnchor,
  EditErrorCode.SeparateNotOnSpine,
  EditErrorCode.SeparateNoNeighbors,
  EditErrorCode.SeparateSameNode,
  EditErrorCode.SeparateDifferentLists,
  EditErrorCode.ForkLaneNotFound,
]);

function mapLegacySeparateError(error: ConceptCurationOpError) {
  if (LEGACY_SEPARATE_ERRORS.has(error)) {
    return { code: error as (typeof EditErrorCode)[keyof typeof EditErrorCode] };
  }

  return { code: EditErrorCode.SeparateNotOnSpine };
}

function publishForCompare(subgraph: ValidatedConceptSubgraph) {
  const next = encodeSubgraph(subgraph);
  sanitizeTrunkForkCuration(next);
  return next;
}

export function planSeparate(
  subgraph: ValidatedConceptSubgraph,
  firstTitle: string,
  lastTitle: string,
): SeparateAdmissibility {
  const legacyTrial = separateSpineRangeToBranches(
    structuredClone(curationInput(subgraph)),
    firstTitle,
    lastTitle,
  );
  if (!legacyTrial.ok) {
    return blocked(mapLegacySeparateError(legacyTrial.error));
  }

  return allowed({
    kind: EditCommandKind.Separate,
    firstTitle,
    lastTitle,
  });
}

export function applySeparate(
  subgraph: ValidatedConceptSubgraph,
  command: SeparateCommand,
): ValidatedConceptSubgraph {
  const legacyResult = separateSpineRangeToBranches(
    structuredClone(curationInput(subgraph)),
    command.firstTitle,
    command.lastTitle,
  );
  if (!legacyResult.ok) {
    return subgraph;
  }

  const nativePlan = planSeparateNative(subgraph, command.firstTitle, command.lastTitle);
  if (nativePlan.admissibility === Admissibility.Allowed) {
    const nativeSubgraph = applySeparateNative(subgraph, nativePlan.command);
    const nativePublished = publishForCompare(nativeSubgraph);
    if (curationsStructurallyEqual(nativePublished, legacyResult.curation)) {
      return markValidated({
        ...nativeSubgraph,
        meta: {
          ...nativeSubgraph.meta,
          sourceCuration: legacyResult.curation,
        },
      });
    }
  }

  return subgraphAfterCuration(subgraph, legacyResult.curation);
}
