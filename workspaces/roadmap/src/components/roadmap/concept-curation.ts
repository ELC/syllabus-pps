import {
  cloneRoadmapCurationData,
  EMPTY_ROADMAP_CURATION,
  parseRoadmapCurationDocumentOrNull,
  roadmapCuration,
  type ConceptBranchOwnerOverrides,
  type ConceptCurationBranches,
  type DegreeRoadmap,
  type ReadonlyRoadmapConceptTitleSet,
  type RoadmapConceptLayoutDocument,
  type RoadmapConceptTitle,
  type RoadmapCuration,
} from "@pps/core";

import { openRoadmapCurationLinearNormalization } from "./concept-curation-normalize";

function titleInScope(title: RoadmapConceptTitle, scope: ReadonlyRoadmapConceptTitleSet): boolean {
  return scope.has(title);
}

function filterTitles(
  titles: readonly RoadmapConceptTitle[],
  scope: ReadonlyRoadmapConceptTitleSet,
): RoadmapConceptTitle[] {
  return titles.filter((title) => titleInScope(title, scope));
}

function filterBranches(
  branches: ConceptCurationBranches,
  scope: ReadonlyRoadmapConceptTitleSet,
): ConceptCurationBranches {
  const next: ConceptCurationBranches = {};

  for (const [owner, items] of Object.entries(branches)) {
    if (!titleInScope(owner, scope)) {
      continue;
    }

    const filtered = filterTitles(items, scope);
    if (filtered.length > 0) {
      next[owner] = filtered;
    }
  }

  return next;
}

/** Keeps only curation entries whose titles belong to the course concept subgraph. */
export function sliceCurationForCourse(
  curation: RoadmapCuration,
  courseRoadmap: DegreeRoadmap,
): RoadmapCuration {
  const scope: ReadonlyRoadmapConceptTitleSet = new Set(
    courseRoadmap.concepts.map((concept) => concept.title),
  );
  const lane = curation.parallelLanes[0];
  const spine = lane ? filterTitles(lane.spine, scope) : [];
  let root = spine[0] ?? "";
  if (root.length === 0 && lane && titleInScope(lane.root, scope)) {
    root = lane.root;
  }

  const branchOwnerOverrides: ConceptBranchOwnerOverrides = {};
  for (const [branch, owner] of Object.entries(curation.branchOwnerOverrides)) {
    if (titleInScope(branch, scope) && titleInScope(owner, scope)) {
      branchOwnerOverrides[branch] = owner;
    }
  }

  return roadmapCuration({
    degreeSlug: courseRoadmap.degreeSlug,
    parallelLanes: root && spine.length > 0 ? [{ root, spine }] : [],
    branches: filterBranches(curation.branches, scope),
    branchOwnerOverrides,
    spinePromotions: filterTitles(curation.spinePromotions ?? [], scope),
    branchLayoutFlips: Object.fromEntries(
      Object.entries(curation.branchLayoutFlips ?? {}).filter(([owner]) =>
        titleInScope(owner, scope),
      ),
    ),
  });
}

export function parseConceptLayoutDocument(
  raw: unknown,
  courseRoadmap: DegreeRoadmap,
): RoadmapCuration | null {
  const parsed = parseRoadmapCurationDocumentOrNull(raw);
  if (!parsed) {
    return null;
  }

  const merged = roadmapCuration({
    ...cloneRoadmapCurationData(EMPTY_ROADMAP_CURATION),
    ...cloneRoadmapCurationData(parsed),
    degreeSlug: courseRoadmap.degreeSlug,
  });

  const sliced = sliceCurationForCourse(merged, courseRoadmap);
  return openRoadmapCurationLinearNormalization(sliced).forCourse(courseRoadmap).curation;
}

/** Canonical storage shape before persisting a course concept layout. */
export function prepareConceptLayoutForStorage(
  curation: RoadmapCuration,
  courseRoadmap: DegreeRoadmap,
): RoadmapCuration {
  return openRoadmapCurationLinearNormalization(curation).forCourse(courseRoadmap).curation;
}

export function conceptLayoutDocumentFromCuration(
  curation: RoadmapCuration,
): RoadmapConceptLayoutDocument {
  return cloneRoadmapCurationData(curation);
}
