import type { RoadmapCuration } from "../components/roadmap/curation";
import { readCompressedTrunkTitles } from "./codec/compressed-trunk";
import { decodeCuration } from "./codec/decode";
import { expandedCurationOrder } from "./traverse-expanded";
import type { ConceptSubgraph } from "./subgraph";

export const CurationInvariantCode = {
  CodecDecode: "codec-decode",
  ForkAnchorMissing: "fork-anchor-missing",
  ForkMergeOrder: "fork-merge-order",
  ForkNoActiveLane: "fork-no-active-lane",
  LaneTopicOnCompressedTrunk: "lane-topic-on-compressed-trunk",
  ForkLaneMissingFromExpandedRegion: "fork-lane-missing-from-expanded-region",
  TopicLost: "topic-lost",
} as const;

export type CurationInvariantCode =
  (typeof CurationInvariantCode)[keyof typeof CurationInvariantCode];

export type CurationInvariantViolation = {
  readonly code: CurationInvariantCode;
  readonly detail?: string;
};

function forkLaneTitles(fork: NonNullable<RoadmapCuration["trunkForks"]>[number]): string[] {
  return fork.lanes.flatMap((lane) => lane.spine);
}

function curatedTopicTitles(curation: RoadmapCuration): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();

  const push = (title: string) => {
    if (!seen.has(title)) {
      seen.add(title);
      titles.push(title);
    }
  };

  for (const title of readCompressedTrunkTitles(curation)) {
    push(title);
  }

  for (const lane of curation.parallelLanes) {
    for (const title of lane.spine) {
      push(title);
    }
  }

  for (const fork of curation.trunkForks ?? []) {
    for (const title of forkLaneTitles(fork)) {
      push(title);
    }
    push(fork.after);
    push(fork.mergeInto);
  }

  for (const branches of Object.values(curation.branches)) {
    for (const title of branches) {
      push(title);
    }
  }

  return titles;
}

/** Structural rules every published concept curation must satisfy. */
export function curationInvariantViolations(
  curation: RoadmapCuration,
): CurationInvariantViolation[] {
  const violations: CurationInvariantViolation[] = [];
  const compressed = [...readCompressedTrunkTitles(curation)];
  const forks = curation.trunkForks ?? [];

  const decoded = decodeCuration(curation);
  if (decoded.outcome !== "decoded") {
    violations.push({ code: CurationInvariantCode.CodecDecode });
  }

  const forkAnchors = new Set<string>();
  for (const fork of forks) {
    forkAnchors.add(fork.after);
    forkAnchors.add(fork.mergeInto);
  }

  const laneOnly = new Set<string>();
  for (const fork of forks) {
    for (const title of forkLaneTitles(fork)) {
      if (!forkAnchors.has(title)) {
        laneOnly.add(title);
      }
    }
  }

  for (const title of laneOnly) {
    if (compressed.includes(title)) {
      violations.push({
        code: CurationInvariantCode.LaneTopicOnCompressedTrunk,
        detail: title,
      });
    }
  }

  for (const fork of forks) {
    if (fork.lanes.every((lane) => lane.spine.length === 0)) {
      violations.push({
        code: CurationInvariantCode.ForkNoActiveLane,
        detail: `${fork.after}->${fork.mergeInto}`,
      });
    }

    const afterIdx = compressed.indexOf(fork.after);
    const mergeIdx = compressed.indexOf(fork.mergeInto);
    if (afterIdx < 0) {
      violations.push({
        code: CurationInvariantCode.ForkAnchorMissing,
        detail: `after:${fork.after}`,
      });
    }

    if (mergeIdx < 0) {
      violations.push({
        code: CurationInvariantCode.ForkAnchorMissing,
        detail: `merge:${fork.mergeInto}`,
      });
    }

    if (afterIdx >= 0 && mergeIdx >= 0 && mergeIdx <= afterIdx) {
      violations.push({
        code: CurationInvariantCode.ForkMergeOrder,
        detail: `${fork.after}->${fork.mergeInto}`,
      });
    }
  }

  if (forks.length > 0) {
    const expanded = expandedCurationOrder(curation);
    for (const fork of forks) {
      const afterIdx = expanded.indexOf(fork.after);
      const mergeIdx = expanded.indexOf(fork.mergeInto);
      if (afterIdx < 0 || mergeIdx <= afterIdx) {
        continue;
      }

      const region = new Set(expanded.slice(afterIdx + 1, mergeIdx));
      for (const title of forkLaneTitles(fork)) {
        if (forkAnchors.has(title)) {
          continue;
        }

        if (!region.has(title)) {
          violations.push({
            code: CurationInvariantCode.ForkLaneMissingFromExpandedRegion,
            detail: title,
          });
        }
      }
    }
  }

  return violations;
}

export function curationSatisfiesInvariants(curation: RoadmapCuration): boolean {
  return curationInvariantViolations(curation).length === 0;
}

export function assertCurationInvariants(curation: RoadmapCuration): void {
  const violations = curationInvariantViolations(curation);
  if (violations.length === 0) {
    return;
  }

  throw new Error(
    `curation invariant violation(s): ${violations
      .map((entry) => (entry.detail ? `${entry.code} (${entry.detail})` : entry.code))
      .join(", ")}`,
  );
}

/** Ensures an edit did not drop curated spine topics from storage. */
export function topicPreservationViolations(
  before: RoadmapCuration,
  after: RoadmapCuration,
): CurationInvariantViolation[] {
  const beforeSet = new Set(curatedTopicTitles(before));
  const afterSet = new Set(curatedTopicTitles(after));
  const violations: CurationInvariantViolation[] = [];

  for (const title of beforeSet) {
    if (!afterSet.has(title)) {
      violations.push({ code: CurationInvariantCode.TopicLost, detail: title });
    }
  }

  return violations;
}

export function assertEditPreservesTopics(
  before: RoadmapCuration,
  after: RoadmapCuration,
): void {
  const violations = topicPreservationViolations(before, after);
  if (violations.length === 0) {
    return;
  }

  throw new Error(
    `edit lost curated topic(s): ${violations.map((entry) => entry.detail).join(", ")}`,
  );
}

export function subgraphFromCuration(curation: RoadmapCuration): ConceptSubgraph | null {
  const decoded = decodeCuration(curation);
  return decoded.outcome === "decoded" ? decoded.subgraph : null;
}
