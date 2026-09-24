import type { RoadmapCuration } from "./curation";
import type { LinearStorageError } from "./lookups";
import { LINEAR_STORAGE_OK } from "./lookups";
export enum LinearCurationInvariantCode {
  NotLinearStorage = "not-linear-storage",
  TopicLost = "topic-lost",
}

export interface LinearCurationInvariantViolation {
  readonly code: LinearCurationInvariantCode;
  readonly detail: string;
}

export function linearCurationInvariantViolations(
  curation: RoadmapCuration,
): LinearCurationInvariantViolation[] {
  const curationOpen = curation.open();
  const layoutRead = curationOpen.readLinearLayout();
  if (layoutRead.isFailure()) {
    return [{ code: LinearCurationInvariantCode.NotLinearStorage, detail: "" }];
  }

  return [];
}

export function linearCurationSatisfiesInvariants(curation: RoadmapCuration): boolean {
  return linearCurationInvariantViolations(curation).length === 0;
}

export function assertLinearCurationInvariants(curation: RoadmapCuration): void {
  const violations = linearCurationInvariantViolations(curation);
  if (violations.length > 0) {
    throw new Error(
      `linear curation invariant(s): ${violations.map((entry) => entry.code).join(", ")}`,
    );
  }
}

export interface TopicPreservationViolation {
  readonly code: LinearCurationInvariantCode.TopicLost;
  readonly detail: string;
}

export function topicPreservationViolations(
  before: RoadmapCuration,
  after: RoadmapCuration,
): TopicPreservationViolation[] {
  const beforeOpen = before.open();
  const afterOpen = after.open();
  const beforeTitles = beforeOpen.curatedTopicTitles();
  const afterTitles = afterOpen.curatedTopicTitles();
  const beforeSet = new Set(beforeTitles);
  const afterSet = new Set(afterTitles);

  const violations: TopicPreservationViolation[] = [];
  for (const title of beforeSet) {
    if (!afterSet.has(title)) {
      violations.push({
        code: LinearCurationInvariantCode.TopicLost,
        detail: title,
      });
    }
  }

  return violations;
}

export function assertEditPreservesTopics(before: RoadmapCuration, after: RoadmapCuration): void {
  const violations = topicPreservationViolations(before, after);
  if (violations.length === 0) {
    return;
  }

  throw new Error(
    `edit lost curated topic(s): ${violations.map((entry) => entry.detail).join(", ")}`,
  );
}


/** Linear layout read failures as edit error codes for UI messaging. */
export function linearStorageError(curation: RoadmapCuration): LinearStorageError {
  const layoutRead = curation.open().readLinearLayout();
  if (layoutRead.isFailure()) {
    return { present: true, code: layoutRead.error };
  }
  return LINEAR_STORAGE_OK;
}
