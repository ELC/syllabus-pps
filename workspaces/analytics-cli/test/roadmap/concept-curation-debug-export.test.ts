import { describe, expect, it } from "vitest";

import {
  buildConceptCurationDebugExport,
  CONCEPT_CURATION_DEBUG_EXPORT_KIND,
} from "../../../roadmap/src/components/roadmap/concept-curation-debug-export";
import {
  createConceptCurationHistory,
  pushConceptCurationHistory,
} from "../../../roadmap/src/components/roadmap/concept-curation-history";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

function curation(trunkSpine: string[]): RoadmapCuration {
  return {
    degreeSlug: "lds",
    parallelLanes: [{ root: trunkSpine[0] ?? "a", spine: trunkSpine }],
    postMergeSpine: [],
    trunkSpine,
    branches: {},
    branchOwnerOverrides: {},
    spineJoins: {},
  };
}

describe("concept curation debug export", () => {
  it("includes previous curation and the action that produced the current state", () => {
    let history = createConceptCurationHistory(curation(["modelo", "sql"]));
    history = pushConceptCurationHistory(history, curation(["trans", "sql"]), {
      kind: "shift",
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

    expect(payload.kind).toBe(CONCEPT_CURATION_DEBUG_EXPORT_KIND);
    expect(payload.lastAction).toEqual({
      kind: "shift",
      title: "trans",
      direction: -1,
    });
    expect(payload.previousCuration?.trunkSpine).toEqual(["modelo", "sql"]);
    expect(payload.curation.trunkSpine).toEqual(["trans", "sql"]);
    expect(payload.historyIndex).toBe(1);
  });
});
