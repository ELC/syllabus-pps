import { roadmapCuration, type RoadmapCuration } from "@pps/core";
import { describe, expect, it } from "vitest";

import {
  canRedoConceptCuration,
  canUndoConceptCuration,
  cloneCurationSnapshot,
  CONCEPT_CURATION_HISTORY_LIMIT,
  createConceptCurationHistory,
  currentConceptCuration,
  pushConceptCurationHistory,
  redoConceptCurationHistory,
  undoConceptCurationHistory,
} from "../../../roadmap/src/components/roadmap/concept-curation-history";
import { ConceptCurationEditActionKind } from "../../../roadmap/src/components/roadmap/concept-curation-edit-action";
import type { ConceptCurationEditActionShift } from "../../../roadmap/src/components/roadmap/concept-curation-edit-action";

function curation(spine: string[]): RoadmapCuration {
  return roadmapCuration({
    degreeSlug: "t",
    parallelLanes: [{ root: spine[0] ?? "a", spine }],
    branches: {},
    branchOwnerOverrides: {},
  });
}

function spineOf(history: ReturnType<typeof createConceptCurationHistory>): string[] {
  return currentConceptCuration(history).parallelLanes[0]?.spine ?? [];
}

const shift = (title: string, direction: -1 | 1): ConceptCurationEditActionShift => ({
  kind: ConceptCurationEditActionKind.Shift,
  title,
  direction,
});

describe("concept curation history", () => {
  it("cloneCurationSnapshot preserves open() for UI state", () => {
    const history = createConceptCurationHistory(curation(["a", "b"]));
    const cloned = cloneCurationSnapshot(currentConceptCuration(history));
    expect(typeof cloned.open).toBe("function");
    expect(cloned.open().readLinearLayout().isSuccess()).toBe(true);
  });

  it("undo and redo traverse snapshots", () => {
    let history = createConceptCurationHistory(curation(["a"]));
    history = pushConceptCurationHistory(history, curation(["b"]), shift("a", 1));
    history = pushConceptCurationHistory(history, curation(["c"]), shift("b", 1));

    expect(spineOf(history)).toEqual(["c"]);

    const undone = undoConceptCurationHistory(history);
    expect(undone).not.toBeNull();
    history = undone!;
    expect(spineOf(history)).toEqual(["b"]);
    expect(canRedoConceptCuration(history)).toBe(true);

    const redone = redoConceptCurationHistory(history);
    history = redone!;
    expect(spineOf(history)).toEqual(["c"]);
    expect(canUndoConceptCuration(history)).toBe(true);
  });

  it("drops redo branch when pushing after undo", () => {
    let history = createConceptCurationHistory(curation(["a"]));
    history = pushConceptCurationHistory(history, curation(["b"]), shift("a", 1));
    history = undoConceptCurationHistory(history)!;
    history = pushConceptCurationHistory(history, curation(["c"]), shift("a", 1));

    expect(history.entries).toHaveLength(2);
    expect(spineOf(history)).toEqual(["c"]);
    expect(canRedoConceptCuration(history)).toBe(false);
  });

  it(`retains at most ${CONCEPT_CURATION_HISTORY_LIMIT} snapshots`, () => {
    let history = createConceptCurationHistory(curation(["0"]));
    for (let index = 1; index <= CONCEPT_CURATION_HISTORY_LIMIT + 5; index += 1) {
      history = pushConceptCurationHistory(
        history,
        curation([String(index)]),
        shift(String(index - 1), 1),
      );
    }

    expect(history.entries).toHaveLength(CONCEPT_CURATION_HISTORY_LIMIT);
    expect(canUndoConceptCuration(history)).toBe(true);
    expect(spineOf(history)).toEqual([String(CONCEPT_CURATION_HISTORY_LIMIT + 5)]);
  });
});
