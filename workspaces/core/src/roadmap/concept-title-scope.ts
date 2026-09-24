import type { ReadonlyRoadmapConceptTitleSet } from "./titles";

/** Use the stored spine without filtering to a course subgraph. */
export interface ConceptTitleScopeUnfiltered {
  readonly filter: false;
}

/** Restrict spine resolution to titles in the course concept subgraph. */
export interface ConceptTitleScopeFiltered {
  readonly filter: true;
  readonly titles: ReadonlyRoadmapConceptTitleSet;
}

export type ConceptTitleScope = ConceptTitleScopeUnfiltered | ConceptTitleScopeFiltered;

export const NO_CONCEPT_TITLE_FILTER: ConceptTitleScopeUnfiltered = { filter: false };

export function conceptTitleScopeForCourse(
  titles: ReadonlyRoadmapConceptTitleSet,
): ConceptTitleScopeFiltered {
  return { filter: true, titles };
}
