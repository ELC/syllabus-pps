import { describe, expect, it } from "vitest";

import {
  canRedoConceptCuration,
  canUndoConceptCuration,
  CONCEPT_CURATION_HISTORY_LIMIT,
  createConceptCurationHistory,
  currentConceptCuration,
  pushConceptCurationHistory,
  redoConceptCurationHistory,
  undoConceptCurationHistory,
} from "../../../roadmap/src/components/roadmap/concept-curation-history";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

function curation(trunkSpine: string[]): RoadmapCuration {
  return {
    degreeSlug: "t",
    parallelLanes: [{ root: trunkSpine[0] ?? "a", spine: trunkSpine }],
    postMergeSpine: [],
    trunkSpine,
    branches: {},
    branchOwnerOverrides: {},
    spineJoins: {},
  };
}

const shift = (title: string, direction: -1 | 1) =>
  ({ kind: "shift", title, direction }) as const;

describe("concept curation history", () => {
  it("undo and redo traverse snapshots", () => {
    let history = createConceptCurationHistory(curation(["a"]));
    history = pushConceptCurationHistory(history, curation(["b"]), shift("a", 1));
    history = pushConceptCurationHistory(history, curation(["c"]), shift("b", 1));

    expect(currentConceptCuration(history).trunkSpine).toEqual(["c"]);

    const undone = undoConceptCurationHistory(history);
    expect(undone).not.toBeNull();
    history = undone!;
    expect(currentConceptCuration(history).trunkSpine).toEqual(["b"]);
    expect(canRedoConceptCuration(history)).toBe(true);

    const redone = redoConceptCurationHistory(history);
    history = redone!;
    expect(currentConceptCuration(history).trunkSpine).toEqual(["c"]);
    expect(canUndoConceptCuration(history)).toBe(true);
  });

  it("drops redo branch when pushing after undo", () => {
    let history = createConceptCurationHistory(curation(["a"]));
    history = pushConceptCurationHistory(history, curation(["b"]), shift("a", 1));
    history = undoConceptCurationHistory(history)!;
    history = pushConceptCurationHistory(history, curation(["c"]), shift("a", 1));

    expect(history.entries).toHaveLength(2);
    expect(currentConceptCuration(history).trunkSpine).toEqual(["c"]);
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
    expect(currentConceptCuration(history).trunkSpine).toEqual([
      String(CONCEPT_CURATION_HISTORY_LIMIT + 5),
    ]);
  });
});
