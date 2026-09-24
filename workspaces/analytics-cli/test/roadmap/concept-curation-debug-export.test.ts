import { roadmapCuration, type RoadmapCuration } from "@pps/core";
import { describe, expect, it } from "vitest";

import { ConceptCurationEditActionKind } from "../../../roadmap/src/components/roadmap/concept-curation-edit-action";
import {
  buildConceptCurationDebugExport,
  ConceptCurationDebugExportKind,
} from "../../../roadmap/src/components/roadmap/concept-curation-debug-export";
import {
  createConceptCurationHistory,
  pushConceptCurationHistory,
} from "../../../roadmap/src/components/roadmap/concept-curation-history";

function curation(spine: string[]): RoadmapCuration {
  return roadmapCuration({
    degreeSlug: "lds",
    parallelLanes: [{ root: spine[0] ?? "a", spine }],
    branches: {},
    branchOwnerOverrides: {},
  });
}

describe("concept curation debug export", () => {
  it("includes previous curation and the action that produced the current state", () => {
    let history = createConceptCurationHistory(curation(["modelo", "sql"]));
    history = pushConceptCurationHistory(history, curation(["trans", "sql"]), {
      kind: ConceptCurationEditActionKind.Shift,
      title: "trans",
      direction: -1,
    });

    const payload = buildConceptCurationDebugExport({
      degreeSlug: "lds",
      courseSlug: "bases-de-datos",
      curation: curation(["trans", "sql"]),
      history,
      selectedTopic: "trans",
      editTool: "select",
      exportedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(payload.kind).toBe(ConceptCurationDebugExportKind.RoadmapConceptLayoutDebug);
    expect(payload.lastAction).toEqual({
      kind: ConceptCurationEditActionKind.Shift,
      title: "trans",
      direction: -1,
    });
    expect(payload.previousCuration?.parallelLanes[0]?.spine).toEqual(["modelo", "sql"]);
    expect(payload.curation.parallelLanes[0]?.spine).toEqual(["trans", "sql"]);
    expect(payload.historyIndex).toBe(1);
  });
});
