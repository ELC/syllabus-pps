/** Discriminant literals for concept subgraph nodes and editor commands. */

export const SpineSegmentKind = {
  Concept: "concept",
  Parallel: "parallel",
} as const;

export type SpineSegmentKind = (typeof SpineSegmentKind)[keyof typeof SpineSegmentKind];

export const GraphNodeKind = {
  Start: "start",
  Terminal: "terminal",
  Primary: "primary",
  Secondary: "secondary",
  Fork: "fork",
  Join: "join",
} as const;

export type GraphNodeKind = (typeof GraphNodeKind)[keyof typeof GraphNodeKind];

export const LocationArea = {
  Trunk: "trunk",
  Lateral: "lateral",
} as const;

export type LocationArea = (typeof LocationArea)[keyof typeof LocationArea];

export const Admissibility = {
  Allowed: "allowed",
  Blocked: "blocked",
} as const;

export type Admissibility = (typeof Admissibility)[keyof typeof Admissibility];

export const EditCommandKind = {
  Shift: "shift",
  Separate: "separate",
  MergeFork: "merge-fork",
  PromoteToSpine: "promote-to-spine",
  AttachLateral: "attach-lateral",
} as const;

export type EditCommandKind = (typeof EditCommandKind)[keyof typeof EditCommandKind];

export const ShiftDirection = {
  Up: -1,
  Down: 1,
} as const;

export type ShiftDirection = (typeof ShiftDirection)[keyof typeof ShiftDirection];

export const StorageMode = {
  TrunkExplicit: "trunk-explicit",
  ParallelOnly: "parallel-only",
} as const;

export type StorageMode = (typeof StorageMode)[keyof typeof StorageMode];
