import type { LinearSpineShiftDirection, RoadmapConceptTitle } from "@pps/core";

export enum ConceptCurationEditActionKind {
  Load = "load",
  Undo = "undo",
  Redo = "redo",
  Shift = "shift",
  AttachSide = "attachSide",
  PromoteToSpine = "promoteToSpine",
}

export interface ConceptCurationEditActionLoad {
  readonly kind: ConceptCurationEditActionKind.Load;
}

export interface ConceptCurationEditActionUndo {
  readonly kind: ConceptCurationEditActionKind.Undo;
}

export interface ConceptCurationEditActionRedo {
  readonly kind: ConceptCurationEditActionKind.Redo;
}

export interface ConceptCurationEditActionShift {
  readonly kind: ConceptCurationEditActionKind.Shift;
  readonly title: RoadmapConceptTitle;
  readonly direction: LinearSpineShiftDirection;
}

export interface ConceptCurationEditActionAttachSide {
  readonly kind: ConceptCurationEditActionKind.AttachSide;
  readonly ownerTitle: RoadmapConceptTitle;
  readonly branchTitle: RoadmapConceptTitle;
}

export interface ConceptCurationEditActionPromoteToSpine {
  readonly kind: ConceptCurationEditActionKind.PromoteToSpine;
  readonly branchTitle: RoadmapConceptTitle;
}

export type ConceptCurationEditAction =
  | ConceptCurationEditActionLoad
  | ConceptCurationEditActionUndo
  | ConceptCurationEditActionRedo
  | ConceptCurationEditActionShift
  | ConceptCurationEditActionAttachSide
  | ConceptCurationEditActionPromoteToSpine;
