import { describe, expect, it } from "vitest";

import { degreeSlugForWorkspaceLinks } from "../../../roadmap/src/RoadmapHeaderWorkspaceLinks";

describe("degreeSlugForWorkspaceLinks", () => {
  it("uses nav degree slug when the panel URL has no degree param", () => {
    expect(
      degreeSlugForWorkspaceLinks(
        {},
        { degreeSlug: "lds", courseSlug: null, scopeAllCarreras: false },
      ),
    ).toBe("lds");
  });

  it("omits degree when Carrera is Todas with a focused course", () => {
    expect(
      degreeSlugForWorkspaceLinks(
        { course: "bases-de-datos" },
        { degreeSlug: "lds", courseSlug: "bases-de-datos", scopeAllCarreras: true },
      ),
    ).toBe("");
  });
});
