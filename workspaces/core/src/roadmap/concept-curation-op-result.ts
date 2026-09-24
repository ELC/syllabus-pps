import type { RoadmapCuration } from "./curation";
import type { EditErrorCode } from "./edit-errors";
import { ResultKind } from "./kinds";
import type { ConceptCurationOpFailure, ConceptCurationOpSuccess } from "./layout-types";
import { attachFailureDiscriminants, attachSuccessDiscriminants } from "./result-discriminants";

export function conceptCurationOpFailure(error: EditErrorCode): ConceptCurationOpFailure {
  return attachFailureDiscriminants({
    kind: ResultKind.Failure,
    error,
  }) as ConceptCurationOpFailure;
}

/** Attaches {@link ConceptCurationOpSuccess.reopen} after the edit transition is built. */
export function withConceptCurationOpReopen(
  curation: RoadmapCuration,
  reopen: ConceptCurationOpSuccess["reopen"],
): ConceptCurationOpSuccess {
  return attachSuccessDiscriminants({
    kind: ResultKind.Success,
    curation,
    reopen,
  }) as ConceptCurationOpSuccess;
}
