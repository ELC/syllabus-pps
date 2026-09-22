import type { RoadmapCuration } from "./curation";

export type ConceptCurationOpError =
  | "no-branch-owner"
  | "no-spine-anchor"
  | "separate-not-on-spine"
  | "separate-no-neighbors"
  | "separate-same-node"
  | "separate-different-lists"
  | "fork-lane-not-found"
  | "merge-fork-not-found"
  | "merge-fork-pick-lane"
  | "side-blocked-merge-join"
  | "side-blocked-fork-anchor"
  | "shift-no-neighbor"
  | "shift-cross-fork-blocked";

export type ConceptCurationOpResult =
  | { ok: true; curation: RoadmapCuration }
  | { ok: false; error: ConceptCurationOpError };
