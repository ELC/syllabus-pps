import type {
  ConceptBranchLayoutFlips,
  ConceptBranchOwnerOverrides,
  ConceptCurationBranches,
  RoadmapCuration,
} from "./curation";
import type { EditErrorCode } from "./edit-errors";
import { ResultKind } from "./kinds";
import type { LinearConceptLayoutEditor } from "./linear-layout-editor";
import type { RoadmapConceptTitle, RoadmapLayoutSlug } from "./titles";

export type { LinearConceptLayoutEditor };

/**
 * Canonical typed edit model for a course concept map (single spine + laterals).
 *
 * Persistence: {@link RoadmapCuration} via {@link curationFromLinearLayout} / {@link readLinearLayout}.
 */
export interface LinearConceptLayout {
  readonly degreeSlug: RoadmapLayoutSlug;
  readonly spine: readonly RoadmapConceptTitle[];
  readonly branches: ConceptCurationBranches;
  readonly branchOwnerOverrides: ConceptBranchOwnerOverrides;
  readonly spinePromotions?: readonly RoadmapConceptTitle[];
  readonly branchLayoutFlips?: ConceptBranchLayoutFlips;
}

export type ConceptCurationOpError = EditErrorCode;

export interface ConceptCurationOpSuccess {
  readonly kind: ResultKind.Success;
  readonly curation: RoadmapCuration;
  isSuccess(): this is ConceptCurationOpSuccess;
  isFailure(): false;
  /** Re-open linear storage after a successful edit (method-driven chain). */
  reopen(): LinearLayoutRead;
}

export interface ConceptCurationOpFailure {
  readonly kind: ResultKind.Failure;
  readonly error: ConceptCurationOpError;
  isSuccess(): false;
  isFailure(): this is ConceptCurationOpFailure;
}

export type ConceptCurationOpResult = ConceptCurationOpSuccess | ConceptCurationOpFailure;

/** Open linear storage: {@link LinearConceptLayoutEditor} methods plus success discriminant. */
export interface LinearLayoutReadSuccess extends LinearConceptLayoutEditor {
  readonly kind: ResultKind.Success;
  isSuccess(): this is LinearLayoutReadSuccess;
  isFailure(): false;
}

export interface LinearLayoutReadFailure {
  readonly kind: ResultKind.Failure;
  readonly error: ConceptCurationOpError;
  isSuccess(): false;
  isFailure(): this is LinearLayoutReadFailure;
}

export type LinearLayoutRead = LinearLayoutReadSuccess | LinearLayoutReadFailure;
