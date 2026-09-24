import type { RoadmapCuration } from "./curation";
import { ParseRoadmapCurationInvalidReason, ResultKind } from "./kinds";
import { attachFailureDiscriminants, attachSuccessDiscriminants } from "./result-discriminants";

export interface ParseRoadmapCurationSuccess {
  readonly kind: ResultKind.Success;
  readonly curation: RoadmapCuration;
  isSuccess(): this is ParseRoadmapCurationSuccess;
  isFailure(): false;
}

export interface ParseRoadmapCurationFailure {
  readonly kind: ResultKind.Failure;
  readonly reason: ParseRoadmapCurationInvalidReason;
  isSuccess(): false;
  isFailure(): this is ParseRoadmapCurationFailure;
}

export type ParseRoadmapCurationOutcome =
  | ParseRoadmapCurationSuccess
  | ParseRoadmapCurationFailure;

export function parseRoadmapCurationSuccess(
  curation: RoadmapCuration,
): ParseRoadmapCurationSuccess {
  return attachSuccessDiscriminants({
    kind: ResultKind.Success,
    curation,
  }) as ParseRoadmapCurationSuccess;
}

export function parseRoadmapCurationFailure(
  reason: ParseRoadmapCurationInvalidReason,
): ParseRoadmapCurationFailure {
  return attachFailureDiscriminants({
    kind: ResultKind.Failure,
    reason,
  }) as ParseRoadmapCurationFailure;
}
