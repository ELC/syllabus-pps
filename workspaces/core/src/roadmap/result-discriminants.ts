import { ResultKind } from "./kinds";

/** Attaches {@link isSuccess} / {@link isFailure} to a success-tagged result object. */
export function attachSuccessDiscriminants<
  S extends { readonly kind: ResultKind.Success },
>(success: S): S & SuccessDiscriminants<S> {
  const result = success as S & SuccessDiscriminants<S>;
  result.isSuccess = function (this: S): this is S {
    return true;
  };
  result.isFailure = function () {
    return false;
  };
  return result;
}

/** Attaches {@link isSuccess} / {@link isFailure} to a failure-tagged result object. */
export function attachFailureDiscriminants<
  F extends { readonly kind: ResultKind.Failure },
>(failure: F): F & FailureDiscriminants<F> {
  const result = failure as F & FailureDiscriminants<F>;
  result.isSuccess = function () {
    return false;
  };
  result.isFailure = function (this: F): this is F {
    return true;
  };
  return result;
}

export interface SuccessDiscriminants<S> {
  isSuccess(): this is S;
  isFailure(): false;
}

export interface FailureDiscriminants<F> {
  isSuccess(): false;
  isFailure(): this is F;
}
