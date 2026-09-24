import type { EditErrorCode } from "./edit-errors";
import type { RoadmapConceptTitle } from "./titles";

/** Lateral topic has a spine owner in the layout. */
export interface BranchOwnerFound {
  readonly found: true;
  readonly owner: RoadmapConceptTitle;
}

/** Lateral topic is not attached under any spine owner. */
export interface BranchOwnerAbsent {
  readonly found: false;
}

export type BranchOwnerLookup = BranchOwnerFound | BranchOwnerAbsent;

export const BRANCH_OWNER_ABSENT: BranchOwnerAbsent = { found: false };

/** Stored curation opens as linear layout. */
export interface LinearStorageReady {
  readonly present: false;
}

/** Stored curation failed linear layout read. */
export interface LinearStorageErrorPresent {
  readonly present: true;
  readonly code: EditErrorCode;
}

export type LinearStorageError = LinearStorageReady | LinearStorageErrorPresent;

export const LINEAR_STORAGE_OK: LinearStorageReady = { present: false };
