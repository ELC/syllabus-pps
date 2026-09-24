import { curationUsesDirectSpineStorage, type RoadmapCuration } from "./curation";
import {
  conceptCurationOpFailure,
  withConceptCurationOpReopen,
} from "./concept-curation-op-result";
import { EditErrorCode } from "./edit-errors";
import { expandedLinearLayoutOrder } from "./linear-layout-persistence";
import type { BranchOwnerLookup } from "./lookups";
import type { ConceptCurationOpResult, LinearConceptLayout, LinearLayoutRead } from "./layout-types";
import type { LinearSpineShiftDirection, RoadmapConceptTitle } from "./titles";
import type { ConceptBranchOwnerOverrides, ConceptCurationBranches } from "./curation";
import {
  branchOwnerForTitle,
  curationFromLinearLayout,
  layoutFromCurationFields,
  removeFromAllBranches,
  withLinearLayout,
} from "./linear-layout-persistence";
import {
  linearLayoutReadFailure,
  linearLayoutReadSuccess,
} from "./linear-layout-read-result";

/**
 * Colocated edit transitions for a {@link LinearConceptLayout}.
 * Obtain via {@link linearConceptLayoutEditor} or {@link readLinearLayout}.
 */
export interface LinearConceptLayoutEditor {
  readonly layout: LinearConceptLayout;
  expandedOrder(): readonly RoadmapConceptTitle[];
  branchOwner(title: RoadmapConceptTitle): BranchOwnerLookup;
  canShift(title: RoadmapConceptTitle, direction: LinearSpineShiftDirection): boolean;
  shift(title: RoadmapConceptTitle, direction: LinearSpineShiftDirection): ConceptCurationOpResult;
  attachSide(ownerTitle: RoadmapConceptTitle, branchTitle: RoadmapConceptTitle): ConceptCurationOpResult;
  promoteToSpine(branchTitle: RoadmapConceptTitle): ConceptCurationOpResult;
  toCuration(): ReturnType<typeof curationFromLinearLayout>;
}

function conceptCurationOpSuccess(curation: RoadmapCuration): ConceptCurationOpResult {
  return withConceptCurationOpReopen(curation, () => readLinearLayout(curation));
}

export function linearConceptLayoutEditor(layout: LinearConceptLayout): LinearConceptLayoutEditor {
  return {
    layout,
    expandedOrder(): readonly string[] {
      return expandedLinearLayoutOrder(layout);
    },
    branchOwner(title: string) {
      return branchOwnerForTitle(layout, title);
    },
    canShift(title: string, direction: -1 | 1): boolean {
      const index = layout.spine.indexOf(title);
      if (index < 0) {
        return false;
      }

      const target = index + direction;
      return target >= 0 && target < layout.spine.length;
    },
    shift(title: string, direction: -1 | 1): ConceptCurationOpResult {
      if (!this.canShift(title, direction)) {
        return conceptCurationOpFailure(EditErrorCode.ShiftNoNeighbor);
      }

      const spine = [...layout.spine];
      const index = spine.indexOf(title);
      const swapWith = spine[index + direction]!;
      spine[index] = swapWith;
      spine[index + direction] = title;

      return conceptCurationOpSuccess(
        curationFromLinearLayout(withLinearLayout(layout, { spine })),
      );
    },
    attachSide(ownerTitle: string, branchTitle: string): ConceptCurationOpResult {
      if (ownerTitle === branchTitle) {
        return conceptCurationOpFailure(EditErrorCode.NoBranchOwner);
      }

      if (!layout.spine.includes(ownerTitle)) {
        return conceptCurationOpFailure(EditErrorCode.NoSpineAnchor);
      }

      let next = layout;
      const spine = next.spine.filter((entry) => entry !== branchTitle);
      next = removeFromAllBranches(withLinearLayout(next, { spine }), branchTitle);

      const siblings = next.branches[ownerTitle] ?? [];
      const branches: ConceptCurationBranches = {
        ...next.branches,
        [ownerTitle]: [...new Set([...siblings, branchTitle])].sort((left, right) =>
          left.localeCompare(right, "es-AR"),
        ),
      };

      const branchOwnerOverrides: ConceptBranchOwnerOverrides = {
        ...next.branchOwnerOverrides,
        [branchTitle]: ownerTitle,
      };

      return conceptCurationOpSuccess(
        curationFromLinearLayout(withLinearLayout(next, { branches, branchOwnerOverrides })),
      );
    },
    promoteToSpine(branchTitle: string): ConceptCurationOpResult {
      const ownerLookup = branchOwnerForTitle(layout, branchTitle);
      if (!ownerLookup.found) {
        return conceptCurationOpFailure(EditErrorCode.NoBranchOwner);
      }

      let next = removeFromAllBranches(layout, branchTitle);

      const spine = [...next.spine.filter((entry) => entry !== branchTitle)];
      const anchorIndex = spine.indexOf(ownerLookup.owner);
      if (anchorIndex < 0) {
        return conceptCurationOpFailure(EditErrorCode.NoSpineAnchor);
      }

      spine.splice(anchorIndex + 1, 0, branchTitle);

      const promotions = next.spinePromotions ? [...next.spinePromotions] : [];
      if (!promotions.includes(branchTitle)) {
        promotions.push(branchTitle);
      }

      return conceptCurationOpSuccess(
        curationFromLinearLayout(
          withLinearLayout(next, { spine, spinePromotions: promotions }),
        ),
      );
    },
    toCuration() {
      return curationFromLinearLayout(layout);
    },
  };
}

/** Opens linear storage for method-driven edits (typestate entry). */
export function readLinearLayout(curation: RoadmapCuration): LinearLayoutRead {
  if (!curationUsesDirectSpineStorage(curation)) {
    return linearLayoutReadFailure(EditErrorCode.CodecInvalidCuration);
  }

  const layout = layoutFromCurationFields(curation);
  return linearLayoutReadSuccess(linearConceptLayoutEditor(layout));
}

/** Alias for {@link readLinearLayout}. */
export const openLinearConceptLayout = readLinearLayout;
