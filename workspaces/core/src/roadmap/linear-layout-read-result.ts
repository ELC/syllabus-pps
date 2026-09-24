import type { EditErrorCode } from "./edit-errors";
import { ResultKind } from "./kinds";
import type { LinearLayoutReadFailure, LinearLayoutReadSuccess } from "./layout-types";
import type { LinearConceptLayoutEditor } from "./linear-layout-editor";
import { attachFailureDiscriminants, attachSuccessDiscriminants } from "./result-discriminants";

export function linearLayoutReadFailure(error: EditErrorCode): LinearLayoutReadFailure {
  return attachFailureDiscriminants({
    kind: ResultKind.Failure,
    error,
  }) as LinearLayoutReadFailure;
}

/** Successful read: edit transitions are methods on this handle (typestate entry). */
export function linearLayoutReadSuccess(
  editor: LinearConceptLayoutEditor,
): LinearLayoutReadSuccess {
  return attachSuccessDiscriminants(
    Object.assign({ kind: ResultKind.Success as const }, editor),
  ) as LinearLayoutReadSuccess;
}
