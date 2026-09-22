import { SpineSegmentKind } from "./kinds";

export type ConceptSegment = {
  readonly kind: typeof SpineSegmentKind.Concept;
  readonly title: string;
};

export type ParallelSegment = {
  readonly kind: typeof SpineSegmentKind.Parallel;
  readonly after: string;
  readonly merge: string;
  readonly lanes: readonly SpinePath[];
};

export type SpineSegment = ConceptSegment | ParallelSegment;

/** Ordered spine path: concepts and nested parallel blocks. */
export type SpinePath = readonly SpineSegment[];

export function conceptSegment(title: string): ConceptSegment {
  return { kind: SpineSegmentKind.Concept, title };
}

export function parallelSegment(
  after: string,
  merge: string,
  lanes: readonly SpinePath[],
): ParallelSegment {
  return { kind: SpineSegmentKind.Parallel, after, merge, lanes };
}
