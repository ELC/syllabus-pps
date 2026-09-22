import type { DegreeRoadmap } from "@pps/core";

import ldsCuration from "../../curations/lds.json";

export interface RoadmapParallelLane {
  root: string;
  spine: string[];
}

export interface RoadmapTrunkFork {
  after: string;
  lanes: RoadmapParallelLane[];
  mergeInto: string;
}

/** Roadmap-only milestone project shown on the spine between a trunk node and the next fork/end. */
export interface RoadmapCapstone {
  id: string;
  after: string;
  title: string;
  description: string;
}

export interface RoadmapCuration {
  degreeSlug: string;
  parallelLanes: RoadmapParallelLane[];
  postMergeSpine: string[];
  /** Ordered main trunk after the post-merge prefix; when set, replaces automatic ordering. */
  trunkSpine?: string[];
  trunkForks?: RoadmapTrunkFork[];
  capstones?: RoadmapCapstone[];
  branches: Record<string, string[]>;
  branchOwnerOverrides: Record<string, string>;
  spineJoins: Record<string, string>;
  spinePromotions?: string[];
  /** When true, left/right branch columns for this spine owner are swapped. */
  branchLayoutFlips?: Record<string, boolean>;
}

export const EMPTY_ROADMAP_CURATION: RoadmapCuration = {
  degreeSlug: "",
  parallelLanes: [],
  postMergeSpine: [],
  trunkSpine: [],
  trunkForks: [],
  capstones: [],
  branches: {},
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: [],
  branchLayoutFlips: {},
};

const curatedModules = import.meta.glob("../../curations/*.json", {
  eager: true,
  import: "default",
}) as Record<string, RoadmapCuration>;

function loadCurations(): Map<string, RoadmapCuration> {
  const curations = new Map<string, RoadmapCuration>();

  for (const curation of Object.values(curatedModules)) {
    curations.set(curation.degreeSlug, curation);
  }

  if (!curations.has(ldsCuration.degreeSlug)) {
    curations.set(ldsCuration.degreeSlug, ldsCuration);
  }

  return curations;
}

const curationsBySlug = loadCurations();

export function listRoadmapCurations(): RoadmapCuration[] {
  return [...curationsBySlug.values()];
}

export function resolveRoadmapCuration(degreeSlug: string): RoadmapCuration | null {
  return curationsBySlug.get(degreeSlug) ?? null;
}

function assertKnownTitle(titles: Set<string>, title: string, context: string): void {
  if (!titles.has(title)) {
    throw new Error(`Roadmap curation references unknown concept "${title}" in ${context}.`);
  }
}

/** Ensures curation titles exist on the projected degree roadmap. */
export function validateRoadmapCuration(
  roadmap: DegreeRoadmap,
  curation: RoadmapCuration,
): void {
  if (curation.degreeSlug !== roadmap.degreeSlug) {
    throw new Error(
      `Roadmap curation slug "${curation.degreeSlug}" does not match degree "${roadmap.degreeSlug}".`,
    );
  }

  const titles = new Set(roadmap.concepts.map((concept) => concept.title));

  for (const lane of curation.parallelLanes) {
    assertKnownTitle(titles, lane.root, `parallel lane root for ${roadmap.degreeSlug}`);
    for (const title of lane.spine) {
      assertKnownTitle(titles, title, `parallel lane spine for ${roadmap.degreeSlug}`);
    }
  }

  for (const title of curation.postMergeSpine) {
    assertKnownTitle(titles, title, `post-merge spine for ${roadmap.degreeSlug}`);
  }

  for (const title of curation.trunkSpine ?? []) {
    assertKnownTitle(titles, title, `trunk spine for ${roadmap.degreeSlug}`);
  }

  for (const [owner, branches] of Object.entries(curation.branches)) {
    assertKnownTitle(titles, owner, `branch owner for ${roadmap.degreeSlug}`);
    for (const branch of branches) {
      assertKnownTitle(titles, branch, `branch of ${owner} for ${roadmap.degreeSlug}`);
    }
  }

  for (const [branch, owner] of Object.entries(curation.branchOwnerOverrides)) {
    assertKnownTitle(titles, branch, `branch owner override for ${roadmap.degreeSlug}`);
    assertKnownTitle(titles, owner, `branch owner override target for ${roadmap.degreeSlug}`);
  }

  for (const [from, to] of Object.entries(curation.spineJoins)) {
    assertKnownTitle(titles, from, `spine join source for ${roadmap.degreeSlug}`);
    assertKnownTitle(titles, to, `spine join target for ${roadmap.degreeSlug}`);
  }

  for (const title of curation.spinePromotions ?? []) {
    assertKnownTitle(titles, title, `spine promotion for ${roadmap.degreeSlug}`);
  }

  for (const fork of curation.trunkForks ?? []) {
    assertKnownTitle(titles, fork.after, `trunk fork source for ${roadmap.degreeSlug}`);
    assertKnownTitle(titles, fork.mergeInto, `trunk fork merge target for ${roadmap.degreeSlug}`);
    for (const lane of fork.lanes) {
      assertKnownTitle(titles, lane.root, `trunk fork lane root for ${roadmap.degreeSlug}`);
      for (const title of lane.spine) {
        assertKnownTitle(titles, title, `trunk fork lane spine for ${roadmap.degreeSlug}`);
      }
    }
  }

  const capstoneIds = new Set<string>();
  for (const capstone of curation.capstones ?? []) {
    if (capstoneIds.has(capstone.id)) {
      throw new Error(
        `Roadmap curation references duplicate capstone id "${capstone.id}" for ${roadmap.degreeSlug}.`,
      );
    }
    capstoneIds.add(capstone.id);
    assertKnownTitle(titles, capstone.after, `capstone anchor for ${roadmap.degreeSlug}`);
  }
}
