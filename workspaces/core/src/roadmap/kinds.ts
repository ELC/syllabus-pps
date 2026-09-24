/** Shared success/failure discriminant for typed curation operations. */
export enum ResultKind {
  Success = "success",
  Failure = "failure",
}

export enum ParseRoadmapCurationInvalidReason {
  NotObject = "not-object",
  Shape = "shape",
}
