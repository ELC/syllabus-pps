import type {
  ConceptBranchOwnerOverrides,
  ConceptCurationBranches,
  RoadmapCuration,
  RoadmapParallelLane,
} from "./curation";
import type { BranchOwnerLookup } from "./lookups";
import { BRANCH_OWNER_ABSENT } from "./lookups";
import { attachRoadmapCurationOpen } from "./roadmap-curation-open";
import type { LinearConceptLayout } from "./layout-types";
import type { RoadmapConceptTitle } from "./titles";

export function layoutFromCurationFields(curation: RoadmapCuration): LinearConceptLayout {
  return {
    degreeSlug: curation.degreeSlug,
    spine: curation.open().mainSpineTitles(),
    branches: curation.branches,
    branchOwnerOverrides: curation.branchOwnerOverrides,
    spinePromotions: curation.spinePromotions,
    branchLayoutFlips: curation.branchLayoutFlips,
  };
}

export function curationFromLinearLayout(layout: LinearConceptLayout): RoadmapCuration {
  const spine = [...layout.spine];
  const parallelLanes: RoadmapParallelLane[] =
    spine.length > 0 ? [{ root: spine[0]!, spine }] : [];

  const curationData = {
    degreeSlug: layout.degreeSlug,
    parallelLanes,
    branches: { ...layout.branches },
    branchOwnerOverrides: { ...layout.branchOwnerOverrides },
    ...(layout.spinePromotions && layout.spinePromotions.length > 0
      ? { spinePromotions: [...layout.spinePromotions] }
      : {}),
    ...(layout.branchLayoutFlips && Object.keys(layout.branchLayoutFlips).length > 0
      ? { branchLayoutFlips: { ...layout.branchLayoutFlips } }
      : {}),
  };

  return attachRoadmapCurationOpen(curationData);
}

export function branchOwnerForTitle(
  layout: LinearConceptLayout,
  title: RoadmapConceptTitle,
): BranchOwnerLookup {
  const override = layout.branchOwnerOverrides[title];
  if (override) {
    return { found: true, owner: override };
  }

  for (const [owner, branches] of Object.entries(layout.branches)) {
    if (branches.includes(title)) {
      return { found: true, owner };
    }
  }

  return BRANCH_OWNER_ABSENT;
}

export function removeFromAllBranches(
  layout: LinearConceptLayout,
  title: RoadmapConceptTitle,
): LinearConceptLayout {
  const branches: ConceptCurationBranches = {};
  for (const [owner, items] of Object.entries(layout.branches)) {
    const filtered = items.filter((entry) => entry !== title);
    if (filtered.length > 0) {
      branches[owner] = filtered;
    }
  }

  const branchOwnerOverrides: ConceptBranchOwnerOverrides = { ...layout.branchOwnerOverrides };
  delete branchOwnerOverrides[title];

  return { ...layout, branches, branchOwnerOverrides };
}

export function withLinearLayout(
  layout: LinearConceptLayout,
  patch: Partial<LinearConceptLayout>,
): LinearConceptLayout {
  return { ...layout, ...patch };
}

export function expandedLinearLayoutOrder(layout: LinearConceptLayout): RoadmapConceptTitle[] {
  const expanded: RoadmapConceptTitle[] = [];

  for (const title of layout.spine) {
    expanded.push(title);
    for (const branchTitle of layout.branches[title] ?? []) {
      if (!layout.spine.includes(branchTitle) && !expanded.includes(branchTitle)) {
        expanded.push(branchTitle);
      }
    }
  }

  return expanded;
}
