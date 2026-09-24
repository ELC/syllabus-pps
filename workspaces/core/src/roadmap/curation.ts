import type { OpenRoadmapCuration } from "./roadmap-curation-open";
import type { RoadmapConceptTitle, RoadmapLayoutSlug } from "./titles";

/** Spine owner → lateral concept titles. */
export interface ConceptCurationBranches {
  [ownerTitle: RoadmapConceptTitle]: RoadmapConceptTitle[];
}

/** Lateral concept → spine owner override. */
export interface ConceptBranchOwnerOverrides {
  [branchTitle: RoadmapConceptTitle]: RoadmapConceptTitle;
}

/** Optional per-owner branch column flip. */
export interface ConceptBranchLayoutFlips {
  [ownerTitle: RoadmapConceptTitle]: boolean;
}

export interface RoadmapParallelLane {
  root: RoadmapConceptTitle;
  spine: RoadmapConceptTitle[];
}

/** JSON fields stored in `public.roadmap_concept_layouts.curation` (no methods). */
export interface RoadmapCurationData {
  degreeSlug: RoadmapLayoutSlug;
  /** Single lane: ordered spine titles (root = spine[0]). */
  parallelLanes: RoadmapParallelLane[];
  branches: ConceptCurationBranches;
  branchOwnerOverrides: ConceptBranchOwnerOverrides;
  spinePromotions?: RoadmapConceptTitle[];
  branchLayoutFlips?: ConceptBranchLayoutFlips;
}

/**
 * Wire format in `public.roadmap_concept_layouts.curation` (JSON + {@link RoadmapCuration.open}).
 *
 * **Edit model:** `curation.open()` → {@link readLinearLayout}.
 */
export interface RoadmapCuration extends RoadmapCurationData {
  open(): OpenRoadmapCuration;
}

export type RoadmapConceptLayoutDocument = RoadmapCurationData;

export function curationUsesDirectSpineStorage(curation: RoadmapCurationData): boolean {
  return curation.parallelLanes.length === 1;
}
