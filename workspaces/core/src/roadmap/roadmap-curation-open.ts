import type {
  ConceptBranchLayoutFlips,
  ConceptCurationBranches,
  RoadmapCuration,
  RoadmapCurationData,
} from "./curation";
import { curationUsesDirectSpineStorage } from "./curation";
import type { ConceptTitleScope } from "./concept-title-scope";
import type { ReadonlyRoadmapConceptTitleSet, RoadmapConceptTitle } from "./titles";
import type { LinearLayoutRead } from "./layout-types";
import { readLinearLayout } from "./linear-layout-editor";

/**
 * Colocated wire-document view of {@link RoadmapCuration} (Postgres JSON).
 */
export interface OpenRoadmapCuration {
  readonly curation: RoadmapCuration;
  isDirectSpineStorage(): boolean;
  readLinearLayout(): LinearLayoutRead;
  mainSpineTitles(): RoadmapConceptTitle[];
  curatedTopicTitles(): RoadmapConceptTitle[];
  expandedTopicOrder(): RoadmapConceptTitle[];
  branchesForSpine(spine: readonly RoadmapConceptTitle[]): ConceptCurationBranches;
  titlesWithinScope(
    titles: readonly RoadmapConceptTitle[],
    scope: ReadonlyRoadmapConceptTitleSet,
  ): RoadmapConceptTitle[];
  /** Spine order for the course concept scope (stored lane, filtered). */
  resolveLinearSpineForScope(scope: ConceptTitleScope): RoadmapConceptTitle[];
  withDirectSpineStorage(spine: readonly RoadmapConceptTitle[]): RoadmapCuration;
}

export function createOpenRoadmapCuration(curation: RoadmapCuration): OpenRoadmapCuration {
  const pushUnique = (ordered: string[], seen: Set<string>, title: string) => {
    if (!seen.has(title)) {
      seen.add(title);
      ordered.push(title);
    }
  };

  return {
    curation,
    isDirectSpineStorage(): boolean {
      return curationUsesDirectSpineStorage(curation);
    },
    readLinearLayout(): LinearLayoutRead {
      return readLinearLayout(curation);
    },
    mainSpineTitles(): string[] {
      const lane = curation.parallelLanes[0];
      return lane ? [...lane.spine] : [];
    },
    curatedTopicTitles(): string[] {
      const read = this.readLinearLayout();
      if (read.isSuccess()) {
        return [...read.expandedOrder()];
      }

      const titles: string[] = [];
      const seen = new Set<string>();
      const push = (title: string) => pushUnique(titles, seen, title);

      for (const title of this.mainSpineTitles()) {
        push(title);
      }

      for (const branches of Object.values(curation.branches)) {
        for (const title of branches) {
          push(title);
        }
      }

      return titles;
    },
    expandedTopicOrder(): string[] {
      const read = this.readLinearLayout();
      if (read.isSuccess()) {
        return [...read.expandedOrder()];
      }

      return this.curatedTopicTitles();
    },
    branchesForSpine(spine: readonly string[]): ConceptCurationBranches {
      const onSpine = new Set(spine);
      const branches: ConceptCurationBranches = {};

      for (const [owner, items] of Object.entries(curation.branches)) {
        if (!onSpine.has(owner)) {
          continue;
        }

        const filtered = items.filter((entry) => !onSpine.has(entry));
        if (filtered.length > 0) {
          branches[owner] = filtered;
        }
      }

      return branches;
    },
    titlesWithinScope(titles: readonly string[], scope: ReadonlySet<string>): string[] {
      return titles.filter((title) => scope.has(title));
    },
    resolveLinearSpineForScope(scope: ConceptTitleScope): string[] {
      const spine = this.mainSpineTitles();
      if (scope.filter) {
        return this.titlesWithinScope(spine, scope.titles);
      }

      return spine;
    },
    withDirectSpineStorage(spine: readonly string[]): RoadmapCuration {
      const spineList = [...spine];
      const onSpine = new Set(spineList);
      const branches = this.branchesForSpine(spineList);

      const branchOwnerOverrides: Record<string, string> = {};
      for (const [branch, owner] of Object.entries(curation.branchOwnerOverrides)) {
        if (onSpine.has(owner) && !onSpine.has(branch) && branches[owner]?.includes(branch)) {
          branchOwnerOverrides[branch] = owner;
        }
      }

      const spinePromotions = (curation.spinePromotions ?? []).filter(
        (title) => !onSpine.has(title),
      );

      const branchLayoutFlips: ConceptBranchLayoutFlips = {};
      for (const [owner, flip] of Object.entries(curation.branchLayoutFlips ?? {})) {
        if (onSpine.has(owner)) {
          branchLayoutFlips[owner] = flip;
        }
      }

      return attachRoadmapCurationOpen({
        degreeSlug: curation.degreeSlug,
        parallelLanes:
          spineList.length > 0 ? [{ root: spineList[0]!, spine: spineList }] : [],
        branches,
        branchOwnerOverrides,
        ...(spinePromotions.length > 0 ? { spinePromotions } : {}),
        ...(Object.keys(branchLayoutFlips).length > 0 ? { branchLayoutFlips } : {}),
      });
    },
  };
}

export function attachRoadmapCurationOpen(data: RoadmapCurationData): RoadmapCuration {
  const curation = data as RoadmapCuration;
  curation.open = function open(this: RoadmapCuration): OpenRoadmapCuration {
    return createOpenRoadmapCuration(this);
  };
  return curation;
}
