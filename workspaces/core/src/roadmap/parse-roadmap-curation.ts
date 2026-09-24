import type {
  ConceptBranchLayoutFlips,
  ConceptBranchOwnerOverrides,
  ConceptCurationBranches,
  RoadmapCuration,
  RoadmapParallelLane,
} from "./curation";
import { ParseRoadmapCurationInvalidReason } from "./kinds";
import type { ParseRoadmapCurationOutcome } from "./parse-roadmap-curation-outcome";
import {
  parseRoadmapCurationFailure,
  parseRoadmapCurationSuccess,
} from "./parse-roadmap-curation-outcome";
import { attachRoadmapCurationOpen } from "./roadmap-curation-open";
import type { RoadmapCurationData } from "./curation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return undefined;
  }

  return value;
}

function readStringBranchesRecord(value: unknown): ConceptCurationBranches | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const out: ConceptCurationBranches = {};
  for (const [key, branches] of Object.entries(value)) {
    const parsed = readStringArray(branches);
    if (!parsed) {
      return undefined;
    }

    out[key] = parsed;
  }

  return out;
}

function readStringStringRecord(value: unknown): ConceptBranchOwnerOverrides | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const out: ConceptBranchOwnerOverrides = {};
  for (const [key, target] of Object.entries(value)) {
    if (typeof target !== "string") {
      return undefined;
    }

    out[key] = target;
  }

  return out;
}

function readParallelLane(value: unknown): RoadmapParallelLane | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const root = value.root;
  const spine = readStringArray(value.spine);
  if (typeof root !== "string" || !spine) {
    return undefined;
  }

  return { root, spine };
}

/** Parse JSON from Postgres/API into a {@link RoadmapCuration} (canonical shape only). */
export function parseRoadmapCurationDocument(value: unknown): ParseRoadmapCurationOutcome {
  if (!isRecord(value)) {
    return parseRoadmapCurationFailure(ParseRoadmapCurationInvalidReason.NotObject);
  }

  const degreeSlug = value.degreeSlug;
  const parallelLanesRaw = value.parallelLanes;
  const branches = readStringBranchesRecord(value.branches ?? {});
  const branchOwnerOverrides =
    value.branchOwnerOverrides === undefined
      ? {}
      : readStringStringRecord(value.branchOwnerOverrides);

  if (
    typeof degreeSlug !== "string" ||
    !Array.isArray(parallelLanesRaw) ||
    !branches ||
    branchOwnerOverrides === undefined
  ) {
    return parseRoadmapCurationFailure(ParseRoadmapCurationInvalidReason.Shape);
  }

  const parallelLanes: RoadmapParallelLane[] = [];
  for (const lane of parallelLanesRaw) {
    const parsed = readParallelLane(lane);
    if (!parsed) {
      return parseRoadmapCurationFailure(ParseRoadmapCurationInvalidReason.Shape);
    }

    parallelLanes.push(parsed);
  }

  if (parallelLanes.length > 1) {
    return parseRoadmapCurationFailure(ParseRoadmapCurationInvalidReason.Shape);
  }

  const curationData: RoadmapCurationData = {
    degreeSlug,
    parallelLanes,
    branches,
    branchOwnerOverrides,
  };

  const spinePromotions = readStringArray(value.spinePromotions);
  if (spinePromotions) {
    curationData.spinePromotions = spinePromotions;
  }

  const branchLayoutFlipsRaw = value.branchLayoutFlips;
  if (branchLayoutFlipsRaw !== undefined) {
    if (!isRecord(branchLayoutFlipsRaw)) {
      return parseRoadmapCurationFailure(ParseRoadmapCurationInvalidReason.Shape);
    }

    const branchLayoutFlips: ConceptBranchLayoutFlips = {};
    for (const [owner, flip] of Object.entries(branchLayoutFlipsRaw)) {
      if (typeof flip !== "boolean") {
        return parseRoadmapCurationFailure(ParseRoadmapCurationInvalidReason.Shape);
      }

      branchLayoutFlips[owner] = flip;
    }

    curationData.branchLayoutFlips = branchLayoutFlips;
  }

  const curation = attachRoadmapCurationOpen(curationData);
  return parseRoadmapCurationSuccess(curation);
}

export function parseRoadmapCurationDocumentOrNull(value: unknown): RoadmapCuration | null {
  const outcome = parseRoadmapCurationDocument(value);
  return outcome.isSuccess() ? outcome.curation : null;
}
