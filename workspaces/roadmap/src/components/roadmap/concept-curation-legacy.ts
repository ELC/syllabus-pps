import type { RoadmapAdjacency } from "./adjacency";
import type { RoadmapCuration, RoadmapParallelLane, RoadmapTrunkFork } from "./curation";
import { attachConceptAsBranch, removeTitleFromCurationSpine } from "./concept-curation";
import { sanitizeTrunkForkCuration } from "./concept-curation-sanitize";

export type {
  ConceptCurationOpError,
  ConceptCurationOpResult,
} from "./concept-curation-op-types";

import type { ConceptCurationOpResult } from "./concept-curation-op-types";

interface MutableStringList {
  read: () => string[];
  write: (next: string[]) => void;
}

function collectOrderedLists(curation: RoadmapCuration): MutableStringList[] {
  const lists: MutableStringList[] = [];

  lists.push({
    read: () => curation.postMergeSpine,
    write: (next) => {
      curation.postMergeSpine = next;
    },
  });

  lists.push({
    read: () => curation.trunkSpine ?? [],
    write: (next) => {
      curation.trunkSpine = next;
    },
  });

  for (const lane of curation.parallelLanes) {
    lists.push({
      read: () => lane.spine,
      write: (next) => {
        lane.spine = next;
      },
    });
  }

  for (const fork of curation.trunkForks ?? []) {
    for (const lane of fork.lanes) {
      lists.push({
        read: () => lane.spine,
        write: (next) => {
          lane.spine = next;
        },
      });
    }
  }

  for (const owner of Object.keys(curation.branches)) {
    lists.push({
      read: () => curation.branches[owner] ?? [],
      write: (next) => {
        if (next.length === 0) {
          delete curation.branches[owner];
        } else {
          curation.branches[owner] = next;
        }
      },
    });
  }

  return lists;
}

function findListIndex(
  curation: RoadmapCuration,
  title: string,
): { list: MutableStringList; index: number } | null {
  for (const list of collectOrderedLists(curation)) {
    const index = list.read().indexOf(title);
    if (index >= 0) {
      return { list, index };
    }
  }

  return null;
}

function spineOrderLists(curation: RoadmapCuration): MutableStringList[] {
  const lists = collectOrderedLists(curation);
  const branchListCount = Object.keys(curation.branches).length;
  return lists.slice(0, Math.max(0, lists.length - branchListCount));
}

function compressedTrunkSpineTitles(curation: RoadmapCuration): string[] {
  if ((curation.trunkSpine ?? []).length > 0) {
    return [...curation.trunkSpine!];
  }

  let best: string[] = [...curation.postMergeSpine];
  for (const lane of curation.parallelLanes) {
    if (lane.spine.length > best.length) {
      best = [...lane.spine];
    }
  }

  return best;
}

/** Linear spine order for Subir/Bajar, with fork lane topics between each fork anchor and merge. */
function buildExpandedSpineOrder(curation: RoadmapCuration): string[] {
  const compressed = compressedTrunkSpineTitles(curation);
  const forkByAfter = new Map((curation.trunkForks ?? []).map((fork) => [fork.after, fork]));
  const expanded: string[] = [];

  for (const title of compressed) {
    expanded.push(title);
    const fork = forkByAfter.get(title);
    if (fork) {
      const titleIdx = compressed.indexOf(title);
      for (const laneTitle of flattenForkLaneTitles(fork)) {
        if (laneTitle === title) {
          continue;
        }
        const laneIdx = compressed.indexOf(laneTitle);
        if (laneIdx > titleIdx) {
          continue;
        }
        expanded.push(laneTitle);
      }
    }
  }

  return expanded;
}

function forkLaneIndexByTitle(fork: RoadmapTrunkFork): Map<string, number> {
  const laneOf = new Map<string, number>();
  for (let laneIndex = 0; laneIndex < fork.lanes.length; laneIndex += 1) {
    for (const title of fork.lanes[laneIndex]!.spine) {
      laneOf.set(title, laneIndex);
    }
  }

  return laneOf;
}

function locateForkRegionInExpanded(
  expanded: string[],
  fork: RoadmapTrunkFork,
  laneTitles: ReadonlySet<string>,
  swap: { title: string; swapWith: string },
): { afterIdx: number; mergeIdx: number; mergeInto: string } | null {
  const mergeSwapsWithLane =
    (swap.title === fork.mergeInto && laneTitles.has(swap.swapWith)) ||
    (swap.swapWith === fork.mergeInto && laneTitles.has(swap.title));
  const mergeInto = mergeSwapsWithLane
    ? swap.title === fork.mergeInto
      ? swap.swapWith
      : swap.title
    : fork.mergeInto;

  const mergeIdx = expanded.indexOf(mergeInto);
  if (mergeIdx <= 0) {
    return null;
  }

  const afterSwapsWithLane =
    (swap.title === fork.after && laneTitles.has(swap.swapWith)) ||
    (swap.swapWith === fork.after && laneTitles.has(swap.title));
  // Lane/anchor swaps must re-root the fork at the topic moving onto the trunk
  // (see concept-graph-admissibility: shift lane topic past fork anchor).
  let afterIdx: number;
  if (afterSwapsWithLane) {
    if (swap.swapWith === fork.after && laneTitles.has(swap.title)) {
      afterIdx = expanded.indexOf(swap.title);
    } else if (swap.title === fork.after && laneTitles.has(swap.swapWith)) {
      afterIdx = expanded.indexOf(swap.swapWith);
    } else {
      afterIdx = expanded.indexOf(fork.after);
    }
  } else {
    afterIdx = expanded.indexOf(fork.after);
  }

  if (afterIdx < 0 || afterIdx >= mergeIdx) {
    afterIdx = mergeIdx - 1;
    while (afterIdx >= 0 && laneTitles.has(expanded[afterIdx]!)) {
      afterIdx -= 1;
    }

    if (
      afterIdx >= 0 &&
      expanded[afterIdx] === swap.title &&
      laneTitles.has(swap.swapWith)
    ) {
      afterIdx -= 1;
    }
  }

  if (afterIdx < 0 || afterIdx >= mergeIdx) {
    return null;
  }

  return { afterIdx, mergeIdx, mergeInto };
}

function laneTitlesOwnedByOtherForks(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): ReadonlySet<string> {
  const titles = new Set<string>();
  for (const other of curation.trunkForks ?? []) {
    if (other === fork) {
      continue;
    }

    for (const title of flattenForkLaneTitles(other)) {
      titles.add(title);
    }
  }

  return titles;
}

function applyExpandedSpineOrder(
  curation: RoadmapCuration,
  expanded: string[],
  swap: { title: string; swapWith: string },
): void {
  for (const fork of curation.trunkForks ?? []) {
    const previousLaneOf = forkLaneIndexByTitle(fork);
    const laneTitles = new Set(previousLaneOf.keys());
    const ownedByOtherForks = laneTitlesOwnedByOtherForks(curation, fork);
    const swapPartnerLane = previousLaneOf.get(swap.swapWith);

    const located = locateForkRegionInExpanded(expanded, fork, laneTitles, swap);
    if (!located) {
      continue;
    }

    const { afterIdx, mergeIdx, mergeInto } = located;
    const previousAfter = fork.after;
    const previousMergeInto = fork.mergeInto;
    fork.after = expanded[afterIdx]!;
    fork.mergeInto = mergeInto;
    const region = expanded.slice(afterIdx + 1, mergeIdx);
    const swapTitleLane = previousLaneOf.get(swap.title);
    const swapWithLane = previousLaneOf.get(swap.swapWith);
    const crossLaneNeighborSwap =
      swapTitleLane !== undefined &&
      swapWithLane !== undefined &&
      swapTitleLane !== swapWithLane &&
      laneTitles.has(swap.title) &&
      laneTitles.has(swap.swapWith);

    for (const lane of fork.lanes) {
      lane.spine = [];
    }

    for (const title of region) {
      if (ownedByOtherForks.has(title) && !laneTitles.has(title)) {
        continue;
      }

      let laneIndex = previousLaneOf.get(title);
      if (crossLaneNeighborSwap) {
        if (title === swap.title) {
          laneIndex = swapWithLane;
        } else if (title === swap.swapWith) {
          laneIndex = swapTitleLane;
        }
      } else if (laneIndex === undefined) {
        if (
          !laneTitles.has(title) &&
          title !== swap.title &&
          title !== swap.swapWith
        ) {
          continue;
        }

        laneIndex =
          title === swap.title
            ? (swapPartnerLane ?? 0)
            : title === swap.swapWith
              ? previousLaneOf.get(swap.title)
              : undefined;
      }

      if (laneIndex === undefined) {
        continue;
      }

      const lane = fork.lanes[laneIndex] ?? fork.lanes[0];
      if (lane) {
        lane.spine.push(title);
      }
    }

    for (let laneIndex = 0; laneIndex < fork.lanes.length; laneIndex += 1) {
      const lane = fork.lanes[laneIndex];
      if (!lane) {
        continue;
      }

      if (
        fork.after === previousAfter &&
        previousLaneOf.get(previousAfter) === laneIndex &&
        !lane.spine.includes(fork.after)
      ) {
        lane.spine.unshift(fork.after);
      }

      if (
        fork.mergeInto === previousMergeInto &&
        previousLaneOf.get(previousMergeInto) === laneIndex &&
        !lane.spine.includes(fork.mergeInto)
      ) {
        lane.spine.push(fork.mergeInto);
      }

      if (lane.spine.length > 0) {
        lane.root = lane.spine[0]!;
      }
    }
  }

  const forkAnchorTitles = new Set(
    (curation.trunkForks ?? []).flatMap((fork) => [fork.after, fork.mergeInto]),
  );
  const forkRegionTitles = new Set(
    (curation.trunkForks ?? []).flatMap((fork) => fork.lanes.flatMap((lane) => lane.spine)),
  );
  const compressed: string[] = [];
  const compressedSeen = new Set<string>();
  for (const title of expanded) {
    if (!forkRegionTitles.has(title) || forkAnchorTitles.has(title)) {
      if (!compressedSeen.has(title)) {
        compressedSeen.add(title);
        compressed.push(title);
      }
    }
  }
  if (compressed.length > 0) {
    curation.trunkSpine = compressed;
  } else if (curation.trunkSpine) {
    delete curation.trunkSpine;
  }

  sanitizeTrunkForkCuration(curation);
}

function titleOnCompressedTrunkSpine(curation: RoadmapCuration, title: string): boolean {
  return compressedTrunkSpineTitles(curation).includes(title);
}

function allForkLaneTitles(curation: RoadmapCuration): Set<string> {
  return new Set(
    (curation.trunkForks ?? []).flatMap((fork) => fork.lanes.flatMap((lane) => lane.spine)),
  );
}

/** Move a downstream fork-lane topic into the upstream fork lane that owns the merge anchor. */
function handoffLaneTopicPastUpstreamMergeAnchor(
  curation: RoadmapCuration,
  swap: { title: string; swapWith: string },
): boolean {
  if (titleOnCompressedTrunkSpine(curation, swap.title)) {
    return false;
  }

  const mergeFork = curation.trunkForks?.find((fork) => fork.mergeInto === swap.swapWith);
  if (!mergeFork) {
    return false;
  }

  const sourceFork = curation.trunkForks?.find(
    (fork) =>
      fork !== mergeFork &&
      fork.lanes.some((lane) => lane.spine.includes(swap.title)),
  );
  if (!sourceFork) {
    return false;
  }

  const mergeLane = mergeFork.lanes.find((lane) => lane.spine.includes(swap.swapWith));
  if (!mergeLane) {
    return false;
  }

  for (const lane of sourceFork.lanes) {
    lane.spine = lane.spine.filter((entry) => entry !== swap.title);
    if (lane.spine.length > 0) {
      lane.root = lane.spine[0]!;
    }
  }
  sourceFork.lanes = compactForkLanes(sourceFork.lanes);

  const mergeIndex = mergeLane.spine.indexOf(swap.swapWith);
  mergeLane.spine.splice(mergeIndex, 0, swap.title);
  mergeLane.root = mergeLane.spine[0]!;

  return true;
}

/** Subir: tail fork merge target swaps past its lane neighbor (transacciones past ACID). */
function shiftTailMergeTargetUp(
  curation: RoadmapCuration,
  title: string,
  swapWith: string,
): RoadmapCuration | null {
  const forkIndex = (curation.trunkForks ?? []).findIndex(
    (fork) =>
      fork.mergeInto === title &&
      fork.lanes.some((lane) => lane.spine.includes(swapWith)) &&
      fork.lanes.some((lane) => lane.spine.includes(title)),
  );
  if (
    forkIndex < 0 ||
    !titleOnCompressedTrunkSpine(curation, title) ||
    !titleOnCompressedTrunkSpine(curation, swapWith)
  ) {
    return null;
  }

  const tailFork = curation.trunkForks![forkIndex]!;
  const titleLaneIdx = tailFork.lanes.findIndex((lane) => lane.spine.includes(title));
  const partnerLaneIdx = tailFork.lanes.findIndex((lane) => lane.spine.includes(swapWith));
  if (titleLaneIdx < 0 || partnerLaneIdx < 0) {
    return null;
  }

  const next = structuredClone(curation);
  const spine = [...(next.trunkSpine ?? compressedTrunkSpineTitles(curation))];
  const leftIndex = spine.indexOf(title);
  const rightIndex = spine.indexOf(swapWith);
  if (leftIndex < 0 || rightIndex < 0) {
    return null;
  }

  spine[leftIndex] = swapWith;
  spine[rightIndex] = title;
  next.trunkSpine = spine;

  const fork = next.trunkForks![forkIndex]!;
  fork.after = title;
  fork.mergeInto = swapWith;
  fork.lanes[titleLaneIdx]!.spine = [swapWith];
  fork.lanes[titleLaneIdx]!.root = swapWith;
  fork.lanes[partnerLaneIdx]!.spine = [title];
  fork.lanes[partnerLaneIdx]!.root = title;
  sanitizeTrunkForkCuration(next);
  return next;
}

/** Move the fork merge anchor when it swaps with an adjacent trunk-only neighbor. */
function handoffTrunkForkMergeIntoForSwap(
  curation: RoadmapCuration,
  swap: { title: string; swapWith: string },
  direction: -1 | 1,
): void {
  const allLaneTitles = allForkLaneTitles(curation);
  for (const fork of curation.trunkForks ?? []) {
    const forkLaneTitles = forkLaneIndexByTitle(fork);
    if (
      direction === 1 &&
      swap.title === fork.mergeInto &&
      !forkLaneTitles.has(swap.swapWith)
    ) {
      fork.mergeInto = swap.swapWith;
    } else if (
      direction === -1 &&
      swap.swapWith === fork.mergeInto &&
      !forkLaneTitles.has(swap.title) &&
      titleOnCompressedTrunkSpine(curation, swap.title)
    ) {
      if (allLaneTitles.has(swap.title)) {
        continue;
      }
      fork.mergeInto = swap.title;
    }
  }
}

function compressedTrunkShiftPreservesForks(
  curation: RoadmapCuration,
  reordered: readonly string[],
): boolean {
  for (const fork of curation.trunkForks ?? []) {
    const afterIdx = reordered.indexOf(fork.after);
    const mergeIdx = reordered.indexOf(fork.mergeInto);
    if (afterIdx < 0 || mergeIdx <= afterIdx) {
      return false;
    }
  }

  return true;
}

/** Repair tail separates that opened at an upstream merge instead of the spine node before the merge target. */
function repairMisplacedTailForkAnchors(curation: RoadmapCuration): void {
  const trunk = compressedTrunkSpineTitles(curation);
  for (const fork of curation.trunkForks ?? []) {
    const mergeIdx = trunk.indexOf(fork.mergeInto);
    const afterIdx = trunk.indexOf(fork.after);
    if (mergeIdx <= 0 || afterIdx < 0 || mergeIdx <= afterIdx + 1) {
      continue;
    }

    const afterIsUpstreamMerge = (curation.trunkForks ?? []).some(
      (other) => other !== fork && other.mergeInto === fork.after,
    );
    if (!afterIsUpstreamMerge) {
      continue;
    }

    if (fork.lanes.some((lane) => lane.spine.includes(fork.after))) {
      continue;
    }

    const forkLaneTitles = new Set(flattenForkLaneTitles(fork));
    let spineOnlyBetween = 0;
    for (let index = afterIdx + 1; index < mergeIdx; index += 1) {
      if (!forkLaneTitles.has(trunk[index]!)) {
        spineOnlyBetween += 1;
      }
    }

    if (spineOnlyBetween === 0) {
      continue;
    }

    const betterAfter = trunk[mergeIdx - 1]!;
    if (betterAfter === fork.after || betterAfter === fork.mergeInto) {
      continue;
    }

    fork.after = betterAfter;
  }
}

export { sanitizeTrunkForkCuration };

export function branchOwnerForConcept(
  curation: RoadmapCuration,
  title: string,
): string | undefined {
  if (curation.branchOwnerOverrides[title]) {
    return curation.branchOwnerOverrides[title];
  }

  for (const [owner, branches] of Object.entries(curation.branches)) {
    if (branches.includes(title)) {
      return owner;
    }
  }

  return undefined;
}

/** Swap two concepts within the same curated ordered list (spine lane or branch siblings). */
export function swapConceptOrder(
  curation: RoadmapCuration,
  leftTitle: string,
  rightTitle: string,
): RoadmapCuration | null {
  if (leftTitle === rightTitle) {
    return curation;
  }

  const next = structuredClone(curation);
  const left = findListIndex(next, leftTitle);
  const right = findListIndex(next, rightTitle);
  if (!left || !right || left.list.read() !== right.list.read()) {
    return null;
  }

  const items = [...left.list.read()];
  items[left.index] = rightTitle;
  items[right.index] = leftTitle;
  left.list.write(items);
  return next;
}

export function inferLayoutBranchOwner(
  title: string,
  adjacency: RoadmapAdjacency,
  stageOf: ReadonlyMap<string, number>,
): string | undefined {
  const prerequisites = adjacency.prerequisites.get(title);
  if (!prerequisites || prerequisites.size === 0) {
    return undefined;
  }

  const [owner] = [...prerequisites].sort(
    (left, right) =>
      (stageOf.get(right) ?? 0) - (stageOf.get(left) ?? 0) ||
      left.localeCompare(right, "es-AR"),
  );

  return owner;
}

export function promoteConceptToSpine(
  curation: RoadmapCuration,
  branchTitle: string,
  options?: { ownerTitle?: string; insertAfterTitle?: string },
): ConceptCurationOpResult {
  const owner = branchOwnerForConcept(curation, branchTitle) ?? options?.ownerTitle;
  if (!owner) {
    return { ok: false, error: "no-branch-owner" };
  }

  const next = structuredClone(curation);
  removeTitleFromCurationSpine(next, branchTitle);

  for (const [key, branches] of Object.entries(next.branches)) {
    next.branches[key] = branches.filter((title) => title !== branchTitle);
    if (next.branches[key]!.length === 0) {
      delete next.branches[key];
    }
  }
  delete next.branchOwnerOverrides[branchTitle];
  delete next.spineJoins[branchTitle];

  if (next.trunkSpine) {
    next.trunkSpine = next.trunkSpine.filter((title) => title !== branchTitle);
    // Keep an empty trunkSpine ([] vs. undefined) so downstream operations
    // (e.g. Separar rama) can detect parallel-only mode. Deleting it would
    // cause the next separate to treat the curation as trunk-mode and split
    // the lane in half.
  }

  const anchor = options?.insertAfterTitle ?? owner;
  const anchorList = findListIndex(next, anchor);
  if (!anchorList) {
    return { ok: false, error: "no-spine-anchor" };
  }

  const items = [...anchorList.list.read()];
  const anchorIndex = items.indexOf(anchor);
  if (anchorIndex >= 0) {
    items.splice(anchorIndex + 1, 0, branchTitle);
  } else {
    items.push(branchTitle);
  }
  anchorList.list.write(items);

  const promotions = new Set(next.spinePromotions ?? []);
  promotions.add(branchTitle);
  next.spinePromotions = [...promotions];

  return { ok: true, curation: next };
}

function parallelLaneIndexForSpineList(
  curation: RoadmapCuration,
  spineList: readonly string[],
): number {
  return curation.parallelLanes.findIndex((lane) => lane.spine === spineList);
}

function buildTrunkForkLanes(
  othersInRange: string[],
  lastSelectedTitle: string,
): RoadmapParallelLane[] {
  if (othersInRange.length === 0) {
    return [{ root: lastSelectedTitle, spine: [lastSelectedTitle] }];
  }

  return [
    { root: othersInRange[0]!, spine: [...othersInRange] },
    { root: lastSelectedTitle, spine: [lastSelectedTitle] },
  ];
}

function parallelLaneIndexForTitle(curation: RoadmapCuration, title: string): number {
  return curation.parallelLanes.findIndex((lane) => lane.spine.includes(title));
}

function flattenForkLaneTitles(fork: RoadmapTrunkFork): string[] {
  return fork.lanes.flatMap((lane) => lane.spine);
}

function compactForkLanes(lanes: RoadmapParallelLane[]): RoadmapParallelLane[] {
  return lanes.filter((lane) => lane.spine.length > 0);
}

function resolveForkSpineList(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): readonly string[] | null {
  if (
    curation.trunkSpine?.includes(fork.after) &&
    curation.trunkSpine.includes(fork.mergeInto)
  ) {
    return curation.trunkSpine;
  }

  const parallelLane = curation.parallelLanes.find((lane) => lane.spine.includes(fork.after));
  if (parallelLane?.spine.includes(fork.mergeInto)) {
    return parallelLane.spine;
  }

  if (curation.trunkSpine?.includes(fork.after)) {
    const spine = [...curation.trunkSpine];
    if (!spine.includes(fork.mergeInto)) {
      const afterIdx = spine.indexOf(fork.after);
      if (afterIdx >= 0) {
        spine.splice(afterIdx + 1, 0, fork.mergeInto);
      } else {
        spine.push(fork.mergeInto);
      }
    }

    return spine;
  }

  if (parallelLane) {
    const spine = [...parallelLane.spine];
    if (!spine.includes(fork.mergeInto)) {
      const afterIdx = spine.indexOf(fork.after);
      if (afterIdx >= 0) {
        spine.splice(afterIdx + 1, 0, fork.mergeInto);
      } else {
        spine.push(fork.mergeInto);
      }
    }

    return spine;
  }

  return null;
}

/** Fork-lane topics first, then spine-only topics between the fork anchor and merge. */
function buildForkScopeVirtualTitles(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): string[] {
  const forkFlat = flattenForkLaneTitles(fork);
  const forkSet = new Set(forkFlat);
  const spine = resolveForkSpineList(curation, fork);
  if (!spine) {
    return forkFlat;
  }

  const afterIdx = spine.indexOf(fork.after);
  const mergeIdx = spine.indexOf(fork.mergeInto);
  if (afterIdx < 0 || mergeIdx <= afterIdx) {
    return forkFlat;
  }

  const spineOnlyBetween = spine
    .slice(afterIdx + 1, mergeIdx)
    .filter((title) => !forkSet.has(title));

  return [...forkFlat, ...spineOnlyBetween];
}

function removeTitlesFromForkSpineStorage(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
  titles: ReadonlySet<string>,
): void {
  const removable = [...titles].filter(
    (title) => title !== fork.after && title !== fork.mergeInto,
  );
  if (removable.length === 0) {
    return;
  }

  const removeSet = new Set(removable);
  if (curation.trunkSpine) {
    curation.trunkSpine = curation.trunkSpine.filter((title) => !removeSet.has(title));
    if (curation.trunkSpine.length === 0) {
      delete curation.trunkSpine;
    }
  }

  for (const lane of curation.parallelLanes) {
    if (!lane.spine.includes(fork.after)) {
      continue;
    }

    lane.spine = lane.spine.filter((title) => !removeSet.has(title));
  }
}

function findTrunkForkLaneForConcept(
  curation: RoadmapCuration,
  title: string,
): { forkIndex: number; laneIndex: number } | null {
  for (let forkIndex = 0; forkIndex < (curation.trunkForks ?? []).length; forkIndex += 1) {
    const fork = curation.trunkForks![forkIndex]!;
    for (let laneIndex = 0; laneIndex < fork.lanes.length; laneIndex += 1) {
      if (fork.lanes[laneIndex]!.spine.includes(title)) {
        return { forkIndex, laneIndex };
      }
    }
  }

  return null;
}

function isTitleInForkLanes(curation: RoadmapCuration, title: string): boolean {
  return findTrunkForkLaneForConcept(curation, title) !== null;
}

function forkOpeningAnchorLaneIndex(fork: RoadmapTrunkFork): number {
  return fork.lanes.findIndex((lane) => lane.spine.includes(fork.after));
}

/** Lane topic still below the fork opening anchor duplicate (must subir past anchor first). */
function isLaneBelowForkOpeningAnchor(
  curation: RoadmapCuration,
  location: { forkIndex: number; laneIndex: number },
): boolean {
  const fork = curation.trunkForks![location.forkIndex]!;
  const anchorLaneIndex = forkOpeningAnchorLaneIndex(fork);
  if (anchorLaneIndex < 0) {
    return false;
  }

  return location.laneIndex > anchorLaneIndex;
}

/** Lane index that pairs across consecutive forks (bottom lane once past the opening anchor). */
function crossForkPeerLaneIndex(
  curation: RoadmapCuration,
  downstream: RoadmapTrunkFork,
  location: { forkIndex: number; laneIndex: number },
): number {
  if (isLaneBelowForkOpeningAnchor(curation, location)) {
    return location.laneIndex;
  }

  const anchorLane = forkOpeningAnchorLaneIndex(downstream);
  if (anchorLane < 0 || downstream.lanes.length <= 1) {
    return location.laneIndex;
  }

  return downstream.lanes.length - 1;
}

/** Subir/Bajar between matching lanes of consecutive forks (e.g. sql ↔ transacciones). */
function crossForkLaneSwapPartner(
  curation: RoadmapCuration,
  title: string,
  direction: -1 | 1,
  linearSwapWith: string,
): string | null {
  const location = findTrunkForkLaneForConcept(curation, title);
  if (!location) {
    return null;
  }

  const forks = curation.trunkForks ?? [];
  if (direction === -1) {
    if (location.forkIndex === 0) {
      return null;
    }

    const downstream = forks[location.forkIndex]!;
    const upstream = forks[location.forkIndex - 1]!;
    if (downstream.after !== upstream.mergeInto) {
      return null;
    }

    if (isLaneBelowForkOpeningAnchor(curation, location)) {
      return null;
    }

    if (
      linearSwapWith !== downstream.after &&
      linearSwapWith !== upstream.mergeInto
    ) {
      return null;
    }

    const peerLaneIndex = crossForkPeerLaneIndex(curation, downstream, location);
    const upstreamLane = upstream.lanes[peerLaneIndex];
    if (!upstreamLane) {
      return null;
    }

    const partner = upstreamLane.spine.find((entry) => entry !== title);
    if (!partner || partner === title) {
      return null;
    }

    return partner;
  }

  if (location.forkIndex + 1 >= forks.length) {
    return null;
  }

  const upstream = forks[location.forkIndex]!;
  const downstream = forks[location.forkIndex + 1]!;
  if (downstream.after !== upstream.mergeInto) {
    return null;
  }

  const atJunction =
    linearSwapWith === downstream.after || linearSwapWith === upstream.mergeInto;
  if (!atJunction) {
    const partnerLocation = findTrunkForkLaneForConcept(curation, linearSwapWith);
    if (!partnerLocation || partnerLocation.forkIndex !== location.forkIndex + 1) {
      return null;
    }

    return linearSwapWith;
  }

  for (const lane of downstream.lanes) {
    const candidate = lane.spine.find(
      (entry) =>
        entry !== title &&
        entry !== downstream.after &&
        entry !== upstream.mergeInto,
    );
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function removeTopicFromLane(
  lane: RoadmapTrunkFork["lanes"][number],
  topic: string,
): void {
  lane.spine = lane.spine.filter((entry) => entry !== topic);
  if (lane.spine.length > 0) {
    lane.root = lane.spine[0]!;
  }
}

function replaceTopicInLane(
  lane: RoadmapTrunkFork["lanes"][number],
  from: string,
  to: string,
): void {
  lane.spine = lane.spine.map((entry) => (entry === from ? to : entry));
  if (lane.root === from) {
    lane.root = to;
  }
}

function applyCrossForkLaneSwap(
  curation: RoadmapCuration,
  title: string,
  partner: string,
): boolean {
  const titleLocation = findTrunkForkLaneForConcept(curation, title);
  const partnerLocation = findTrunkForkLaneForConcept(curation, partner);
  if (!titleLocation || !partnerLocation) {
    return false;
  }

  if (Math.abs(titleLocation.forkIndex - partnerLocation.forkIndex) !== 1) {
    return false;
  }

  const downstreamForkIndex = Math.max(titleLocation.forkIndex, partnerLocation.forkIndex);
  const downstream = curation.trunkForks![downstreamForkIndex]!;
  const upstream = curation.trunkForks![downstreamForkIndex - 1]!;
  const titleOnDownstream = titleLocation.forkIndex === downstreamForkIndex;
  const downstreamReceiveLaneIndex = titleOnDownstream
    ? titleLocation.laneIndex
    : partnerLocation.laneIndex;
  const upstreamReceiveLaneIndex = titleOnDownstream
    ? partnerLocation.laneIndex
    : titleLocation.laneIndex;

  const downstreamReceiveLane = downstream.lanes[downstreamReceiveLaneIndex];
  const upstreamReceiveLane = upstream.lanes[upstreamReceiveLaneIndex];
  if (!downstreamReceiveLane || !upstreamReceiveLane) {
    return false;
  }

  if (
    titleLocation.laneIndex === partnerLocation.laneIndex &&
    titleLocation.laneIndex === downstreamReceiveLaneIndex &&
    titleLocation.laneIndex === upstreamReceiveLaneIndex
  ) {
    replaceTopicInLane(downstreamReceiveLane, title, partner);
    replaceTopicInLane(upstreamReceiveLane, partner, title);
    return true;
  }

  const anchorLaneIndex = forkOpeningAnchorLaneIndex(downstream);

  removeTopicFromLane(
    titleOnDownstream
      ? downstream.lanes[titleLocation.laneIndex]!
      : upstream.lanes[titleLocation.laneIndex]!,
    title,
  );
  removeTopicFromLane(
    titleOnDownstream
      ? upstream.lanes[partnerLocation.laneIndex]!
      : downstream.lanes[partnerLocation.laneIndex]!,
    partner,
  );

  const downstreamTopic = titleOnDownstream ? partner : title;
  const upstreamTopic = titleOnDownstream ? title : partner;
  downstreamReceiveLane.spine = [downstreamTopic];
  downstreamReceiveLane.root = downstreamTopic;
  upstreamReceiveLane.spine = [upstreamTopic];
  upstreamReceiveLane.root = upstreamTopic;

  if (anchorLaneIndex >= 0 && anchorLaneIndex !== downstreamReceiveLaneIndex) {
    const anchorLane = downstream.lanes[anchorLaneIndex]!;
    if (anchorLane.spine.length === 0 || !anchorLane.spine.includes(downstream.after)) {
      anchorLane.spine = [downstream.after];
      anchorLane.root = downstream.after;
    }
  }

  return true;
}

/** Subir past the fork opening anchor by swapping lanes, keeping the anchor on the compressed trunk. */
function swapForkLaneWithOpeningAnchor(
  curation: RoadmapCuration,
  title: string,
  anchor: string,
): boolean {
  const location = findTrunkForkLaneForConcept(curation, title);
  if (!location || titleOnCompressedTrunkSpine(curation, title)) {
    return false;
  }

  const fork = curation.trunkForks![location.forkIndex]!;
  if (fork.after !== anchor) {
    return false;
  }

  const anchorLaneIndex = forkOpeningAnchorLaneIndex(fork);
  if (anchorLaneIndex < 0 || anchorLaneIndex === location.laneIndex) {
    return false;
  }

  if (location.laneIndex <= anchorLaneIndex) {
    return false;
  }

  const titleLane = fork.lanes[location.laneIndex]!;
  const anchorLane = fork.lanes[anchorLaneIndex]!;
  const titleSpine = titleLane.spine;
  titleLane.spine = [...anchorLane.spine];
  titleLane.root = titleLane.spine[0] ?? titleLane.root;
  anchorLane.spine = [...titleSpine];
  anchorLane.root = anchorLane.spine[0] ?? anchorLane.root;
  return true;
}

/** Bajar past the fork opening anchor by swapping lanes (inverse of swapForkLaneWithOpeningAnchor). */
function swapForkLaneWithClosingAnchor(
  curation: RoadmapCuration,
  title: string,
  anchor: string,
): boolean {
  const location = findTrunkForkLaneForConcept(curation, title);
  if (!location || titleOnCompressedTrunkSpine(curation, title)) {
    return false;
  }

  const fork = curation.trunkForks![location.forkIndex]!;
  if (fork.after !== anchor) {
    return false;
  }

  const anchorLaneIndex = forkOpeningAnchorLaneIndex(fork);
  if (anchorLaneIndex < 0 || anchorLaneIndex === location.laneIndex) {
    return false;
  }

  if (location.laneIndex >= anchorLaneIndex) {
    return false;
  }

  const titleLane = fork.lanes[location.laneIndex]!;
  const anchorLane = fork.lanes[anchorLaneIndex]!;
  const titleSpine = titleLane.spine;
  titleLane.spine = [...anchorLane.spine];
  titleLane.root = titleLane.spine[0] ?? titleLane.root;
  anchorLane.spine = [...titleSpine];
  anchorLane.root = anchorLane.spine[0] ?? anchorLane.root;
  return true;
}

function forkSpineSegmentBeforeMerge(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): string[] {
  const spine = resolveForkSpineList(curation, fork);
  if (!spine) {
    return [];
  }

  const afterIdx = spine.indexOf(fork.after);
  const mergeIdx = spine.indexOf(fork.mergeInto);
  if (afterIdx < 0 || mergeIdx <= afterIdx) {
    return [];
  }

  return spine.slice(afterIdx + 1, mergeIdx);
}

function forkScopeVirtualTitles(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): string[] {
  const forkFlat = flattenForkLaneTitles(fork);
  if (forkFlat.length > 0) {
    return buildForkScopeVirtualTitles(curation, fork);
  }

  return forkSpineSegmentBeforeMerge(curation, fork);
}

function peelForkTopicToNewLane(
  curation: RoadmapCuration,
  forkIndex: number,
  title: string,
): ConceptCurationOpResult {
  const location = findTrunkForkLaneForConcept(curation, title);
  if (!location || location.forkIndex !== forkIndex) {
    return promoteSpineSegmentToForkLanes(curation, forkIndex, title);
  }

  const next = structuredClone(curation);
  const fork = next.trunkForks![forkIndex]!;
  const lane = fork.lanes[location.laneIndex]!;
  lane.spine = lane.spine.filter((entry) => entry !== title);
  fork.lanes = compactForkLanes([
    ...fork.lanes,
    { root: title, spine: [title] },
  ]);

  return { ok: true, curation: next };
}

function promoteSpineSegmentToForkLanes(
  curation: RoadmapCuration,
  forkIndex: number,
  insideTitle: string,
): ConceptCurationOpResult {
  const fork = curation.trunkForks?.[forkIndex];
  if (!fork) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const segment = forkSpineSegmentBeforeMerge(curation, fork);
  const insideIdx = segment.indexOf(insideTitle);
  if (insideIdx < 0) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const moving = segment.slice(insideIdx);
  const next = structuredClone(curation);
  const nextFork = next.trunkForks![forkIndex]!;
  removeTitlesFromForkSpineStorage(next, nextFork, new Set(moving));

  for (const title of moving) {
    nextFork.lanes = compactForkLanes([
      ...nextFork.lanes,
      { root: title, spine: [title] },
    ]);
  }

  for (const title of moving) {
    delete next.spineJoins[title];
    delete next.branchOwnerOverrides[title];
  }

  return { ok: true, curation: next };
}

function resolveSeparateMergeInto(
  curation: RoadmapCuration,
  spine: readonly string[],
  laterIdx: number,
): string | null {
  const lastInRange = spine[laterIdx];
  if (lastInRange !== undefined) {
    const downstreamForkOpensOnLast = (curation.trunkForks ?? []).some(
      (fork) => fork.after === lastInRange,
    );
    if (downstreamForkOpensOnLast) {
      return lastInRange;
    }
  }

  if (laterIdx + 1 < spine.length) {
    return spine[laterIdx + 1]!;
  }

  if (laterIdx < spine.length) {
    return spine[laterIdx]!;
  }

  return null;
}

function forkAfterIsSpineOnlyBetweenAnchors(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): boolean {
  const spine = resolveForkSpineList(curation, fork);
  if (!spine) {
    return false;
  }

  const afterIdx = spine.indexOf(fork.after);
  const mergeIdx = spine.indexOf(fork.mergeInto);
  if (afterIdx < 0 || mergeIdx <= afterIdx) {
    return false;
  }

  return spine.slice(afterIdx + 1, mergeIdx).includes(fork.after);
}

/** Spine title where a new fork opens when splitting below an existing trunk fork. */
function resolveNewForkAfterAnchor(
  curation: RoadmapCuration,
  spine: readonly string[],
  rangeStartIdx: number,
): string {
  const predecessor = spine[rangeStartIdx - 1];
  if (predecessor === undefined) {
    return spine[0] ?? "";
  }

  const forkAtPredecessor = (curation.trunkForks ?? []).find(
    (fork) => fork.after === predecessor,
  );
  if (forkAtPredecessor) {
    return forkAtPredecessor.mergeInto;
  }

  if ((curation.trunkForks ?? []).some((fork) => fork.mergeInto === predecessor)) {
    return predecessor;
  }

  for (const fork of curation.trunkForks ?? []) {
    if (flattenForkLaneTitles(fork).includes(predecessor)) {
      return fork.mergeInto;
    }
  }

  return predecessor;
}

function buildMainSpineAfterSeparate(
  spine: readonly string[],
  soonerIdx: number,
  laterIdx: number,
  forkAfter: string,
  mergeInto: string,
): string[] {
  const opensAtSpineHead = soonerIdx === 0;
  const mergesAtLastSelected = mergeInto === spine[laterIdx];
  const mergesAtSpineTail = mergesAtLastSelected && laterIdx + 1 >= spine.length;

  const head = opensAtSpineHead ? [forkAfter] : spine.slice(0, soonerIdx);
  const tail = mergesAtSpineTail
    ? []
    : mergesAtLastSelected
      ? spine.slice(laterIdx + 1)
      : spine.slice(laterIdx + 2);

  const result = [...head];
  if (!result.includes(mergeInto)) {
    result.push(mergeInto);
  }

  for (const title of tail) {
    if (!result.includes(title)) {
      result.push(title);
    }
  }

  if (!opensAtSpineHead && !result.includes(forkAfter)) {
    const mergeIdx = result.indexOf(mergeInto);
    if (mergeIdx >= 0) {
      result.splice(mergeIdx, 0, forkAfter);
    }
  }

  return result;
}

function findTrunkForkForSpineEndMerge(
  curation: RoadmapCuration,
  spine: readonly string[],
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): number | null {
  for (let forkIndex = 0; forkIndex < (curation.trunkForks ?? []).length; forkIndex += 1) {
    const fork = curation.trunkForks![forkIndex]!;
    if (lastSelectedTitle !== fork.mergeInto) {
      continue;
    }

    const afterIdx = spine.indexOf(fork.after);
    const mergeIdx = spine.indexOf(fork.mergeInto);
    const firstIdx = spine.indexOf(firstSelectedTitle);
    if (afterIdx < 0 || mergeIdx <= afterIdx || firstIdx <= afterIdx || firstIdx >= mergeIdx) {
      continue;
    }

    return forkIndex;
  }

  return null;
}

/** Split a range inside an existing trunk fork into additional lanes (N ≥ 2). */
function separateRangeOnVirtualForkTitles(
  curation: RoadmapCuration,
  forkIndex: number,
  virtualTitles: readonly string[],
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): ConceptCurationOpResult {
  const fork = curation.trunkForks?.[forkIndex];
  if (!fork) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const firstFlat = virtualTitles.indexOf(firstSelectedTitle);
  const lastFlat = virtualTitles.indexOf(lastSelectedTitle);
  if (firstFlat < 0 || lastFlat < 0) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const soonerIdx = Math.min(firstFlat, lastFlat);
  const laterIdx = Math.max(firstFlat, lastFlat);
  if (soonerIdx === laterIdx) {
    return { ok: false, error: "separate-same-node" };
  }

  const rangeTitles = virtualTitles.slice(soonerIdx, laterIdx + 1);
  const branchLast =
    lastSelectedTitle === fork.mergeInto
      ? virtualTitles[laterIdx]!
      : lastSelectedTitle;
  const othersInRange = rangeTitles.filter((title) => title !== branchLast);
  const rangeSet = new Set(rangeTitles);

  const next = structuredClone(curation);
  const nextFork = next.trunkForks![forkIndex]!;
  for (const lane of nextFork.lanes) {
    lane.spine = lane.spine.filter((title) => !rangeSet.has(title));
  }

  const newLanes = buildTrunkForkLanes(othersInRange, branchLast).filter(
    (lane) => lane.spine[0] !== fork.mergeInto,
  );
  nextFork.lanes = compactForkLanes([...nextFork.lanes, ...newLanes]);
  removeTitlesFromForkSpineStorage(next, nextFork, rangeSet);

  for (const title of rangeTitles) {
    delete next.spineJoins[title];
    delete next.branchOwnerOverrides[title];
  }

  return { ok: true, curation: next };
}

function separateRangeWithinTrunkFork(
  curation: RoadmapCuration,
  forkIndex: number,
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): ConceptCurationOpResult {
  const fork = curation.trunkForks?.[forkIndex];
  if (!fork) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  return separateRangeOnVirtualForkTitles(
    curation,
    forkIndex,
    flattenForkLaneTitles(fork),
    firstSelectedTitle,
    lastSelectedTitle,
  );
}

function separateForkLaneAndSpineSelection(
  curation: RoadmapCuration,
  forkIndex: number,
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): ConceptCurationOpResult {
  const fork = curation.trunkForks?.[forkIndex];
  if (!fork) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const lastIsMergeInto = lastSelectedTitle === fork.mergeInto;
  const firstIsMergeInto = firstSelectedTitle === fork.mergeInto;
  const virtualTitles = forkScopeVirtualTitles(curation, fork);

  if (lastIsMergeInto || firstIsMergeInto) {
    const insideTitle = firstIsMergeInto ? lastSelectedTitle : firstSelectedTitle;
    if (insideTitle === fork.mergeInto) {
      return { ok: false, error: "separate-same-node" };
    }

    const insideIdx = virtualTitles.indexOf(insideTitle);
    if (insideIdx < 0) {
      return promoteSpineSegmentToForkLanes(curation, forkIndex, insideTitle);
    }

    if (virtualTitles.length <= 1 || insideIdx >= virtualTitles.length - 1) {
      return peelForkTopicToNewLane(curation, forkIndex, insideTitle);
    }

    const throughLast = virtualTitles[virtualTitles.length - 1]!;
    return separateRangeOnVirtualForkTitles(
      curation,
      forkIndex,
      virtualTitles,
      insideTitle,
      throughLast,
    );
  }

  const firstInVirtual = virtualTitles.includes(firstSelectedTitle);
  const lastInVirtual = virtualTitles.includes(lastSelectedTitle);
  if (!firstInVirtual || !lastInVirtual) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  return separateRangeOnVirtualForkTitles(
    curation,
    forkIndex,
    virtualTitles,
    firstSelectedTitle,
    lastSelectedTitle,
  );
}

/** Fork-lane topic + later trunk topic (e.g. ACID on a lane, Transacciones on the spine). */
function separateForkLaneTopicAndTrunkTitle(
  curation: RoadmapCuration,
  laneTitle: string,
  trunkTitle: string,
): ConceptCurationOpResult {
  const laneLocation = findTrunkForkLaneForConcept(curation, laneTitle);
  if (!laneLocation) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const compressed = compressedTrunkSpineTitles(curation);
  const trunkIdx = compressed.indexOf(trunkTitle);
  if (trunkIdx < 0) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const hostFork = curation.trunkForks![laneLocation.forkIndex]!;
  if (trunkIdx <= 0) {
    return { ok: false, error: "separate-no-neighbors" };
  }

  const forkAfter = compressed[trunkIdx - 1]!;
  if (forkAfter === trunkTitle) {
    return { ok: false, error: "separate-same-node" };
  }

  const forkAfterIdx = compressed.indexOf(forkAfter);
  if (forkAfterIdx < 0 || forkAfterIdx >= trunkIdx) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const next = structuredClone(curation);
  const host = next.trunkForks![laneLocation.forkIndex]!;
  host.lanes[laneLocation.laneIndex]!.spine = host.lanes[laneLocation.laneIndex]!.spine.filter(
    (title) => title !== laneTitle,
  );
  host.lanes = compactForkLanes(host.lanes);

  const fork: RoadmapTrunkFork = {
    after: forkAfter,
    mergeInto: trunkTitle,
    lanes: [
      { root: laneTitle, spine: [laneTitle] },
      { root: trunkTitle, spine: [trunkTitle] },
    ],
  };

  const mainSpine = buildMainSpineAfterSeparate(
    compressed,
    forkAfterIdx,
    trunkIdx,
    forkAfter,
    trunkTitle,
  );

  const parallelOnlySpine =
    curation.trunkSpine !== undefined && (curation.trunkSpine ?? []).length === 0;
  const laneIndex = parallelLaneIndexForTitle(next, forkAfter);

  if (parallelOnlySpine && next.parallelLanes.length > 0) {
    const targetLane = laneIndex >= 0 ? laneIndex : 0;
    next.parallelLanes[targetLane]!.spine = [...mainSpine];
    delete next.trunkSpine;
  } else {
    next.trunkSpine = mainSpine;
    if (laneIndex >= 0) {
      next.parallelLanes[laneIndex]!.spine = [forkAfter];
    }
  }

  delete next.spineJoins[laneTitle];
  delete next.branchOwnerOverrides[laneTitle];
  delete next.spineJoins[trunkTitle];
  delete next.branchOwnerOverrides[trunkTitle];

  next.trunkForks = [...(next.trunkForks ?? []).filter((entry) => entry.after !== forkAfter), fork];
  sanitizeTrunkForkCuration(next);

  return { ok: true, curation: next };
}

function separateRangeOnSpineOrder(
  curation: RoadmapCuration,
  spine: readonly string[],
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): ConceptCurationOpResult {
  const firstIndex = spine.indexOf(firstSelectedTitle);
  const lastIndex = spine.indexOf(lastSelectedTitle);
  if (firstIndex < 0 || lastIndex < 0) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const soonerIdx = Math.min(firstIndex, lastIndex);
  const laterIdx = Math.max(firstIndex, lastIndex);
  if (soonerIdx === laterIdx) {
    return { ok: false, error: "separate-same-node" };
  }

  const forkForEndMerge = findTrunkForkForSpineEndMerge(
    curation,
    spine,
    firstSelectedTitle,
    lastSelectedTitle,
  );
  if (forkForEndMerge !== null) {
    return separateForkLaneAndSpineSelection(
      curation,
      forkForEndMerge,
      firstSelectedTitle,
      lastSelectedTitle,
    );
  }

  const mergeInto = resolveSeparateMergeInto(curation, spine, laterIdx);
  if (!mergeInto) {
    return { ok: false, error: "separate-no-neighbors" };
  }

  if (spine.length < 2 || laterIdx - soonerIdx < 1) {
    return { ok: false, error: "separate-no-neighbors" };
  }

  const mergesAtSpineTail =
    mergeInto === spine[laterIdx] && laterIdx + 1 >= spine.length;
  const adjacentTailPair = mergesAtSpineTail && laterIdx - soonerIdx === 1;
  const curatedDegreeLayout =
    (curation.trunkSpine ?? []).length > 0 || (curation.trunkForks ?? []).length > 0;
  const forkAfter =
    soonerIdx === 0
      ? spine[0]!
      : adjacentTailPair && curatedDegreeLayout
        ? spine[soonerIdx]!
        : resolveNewForkAfterAnchor(curation, spine, soonerIdx);
  const rangeTitles = spine.slice(soonerIdx, laterIdx + 1);
  const mainSpine = buildMainSpineAfterSeparate(
    spine,
    soonerIdx,
    laterIdx,
    forkAfter,
    mergeInto,
  );

  const branchLast = spine[laterIdx]!;
  const orderedOthersInRange = rangeTitles.filter((title) => title !== branchLast);
  const fork: RoadmapTrunkFork = {
    after: forkAfter,
    lanes: buildTrunkForkLanes(orderedOthersInRange, branchLast),
    mergeInto,
  };

  const next = structuredClone(curation);
  const nextLoc = findListIndex(next, firstSelectedTitle);
  if (!nextLoc) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const laneIndex = parallelLaneIndexForSpineList(next, nextLoc.list.read());

  if (laneIndex >= 0) {
    const parallelOnlySpine =
      curation.trunkSpine !== undefined && (curation.trunkSpine ?? []).length === 0;
    if (parallelOnlySpine) {
      next.parallelLanes[laneIndex]!.spine = [...mainSpine];
      delete next.trunkSpine;
    } else {
      next.trunkSpine = mainSpine;
      next.parallelLanes[laneIndex]!.spine = [forkAfter];
    }
  } else {
    nextLoc.list.write(mainSpine);
  }

  for (const title of rangeTitles) {
    delete next.spineJoins[title];
    delete next.branchOwnerOverrides[title];
  }

  next.trunkForks = [...(next.trunkForks ?? []).filter((entry) => entry.after !== forkAfter), fork];
  sanitizeTrunkForkCuration(next);

  return { ok: true, curation: next };
}

/**
 * Two spine picks (second = last selected): record a trunk fork (same as degree forks)—
 * main spine skips the range; fork lanes hold the split paths and merge at `mergeInto`.
 */
export function separateSpineRangeToBranches(
  curation: RoadmapCuration,
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): ConceptCurationOpResult {
  const firstForkLane = findTrunkForkLaneForConcept(curation, firstSelectedTitle);
  const lastForkLane = findTrunkForkLaneForConcept(curation, lastSelectedTitle);
  if (
    firstForkLane &&
    lastForkLane &&
    firstForkLane.forkIndex === lastForkLane.forkIndex
  ) {
    return separateRangeWithinTrunkFork(
      curation,
      firstForkLane.forkIndex,
      firstSelectedTitle,
      lastSelectedTitle,
    );
  }

  const firstInFork = isTitleInForkLanes(curation, firstSelectedTitle);
  const lastInFork = isTitleInForkLanes(curation, lastSelectedTitle);
  if (firstInFork !== lastInFork) {
    const forkIndex = (firstForkLane ?? lastForkLane)!.forkIndex;
    const mixed = separateForkLaneAndSpineSelection(
      curation,
      forkIndex,
      firstSelectedTitle,
      lastSelectedTitle,
    );
    if (mixed.ok || mixed.error !== "separate-not-on-spine") {
      return mixed;
    }

    const laneTitle = firstInFork ? firstSelectedTitle : lastSelectedTitle;
    const trunkTitle = firstInFork ? lastSelectedTitle : firstSelectedTitle;
    return separateForkLaneTopicAndTrunkTitle(curation, laneTitle, trunkTitle);
  }

  const firstLoc = findListIndex(curation, firstSelectedTitle);
  const lastLoc = findListIndex(curation, lastSelectedTitle);
  if (!firstLoc || !lastLoc) {
    return { ok: false, error: "separate-not-on-spine" };
  }

  const compressedSpine = compressedTrunkSpineTitles(curation);
  const bothOnCompressed =
    compressedSpine.includes(firstSelectedTitle) &&
    compressedSpine.includes(lastSelectedTitle);

  if (!bothOnCompressed && firstLoc.list.read() !== lastLoc.list.read()) {
    return { ok: false, error: "separate-different-lists" };
  }

  const spine = bothOnCompressed ? compressedSpine : firstLoc.list.read();
  return separateRangeOnSpineOrder(
    curation,
    spine,
    firstSelectedTitle,
    lastSelectedTitle,
  );
}

function spineOnlyBetweenForkAnchors(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): string[] {
  const spine = resolveForkSpineList(curation, fork);
  if (!spine) {
    return [];
  }

  const afterIdx = spine.indexOf(fork.after);
  const mergeIdx = spine.indexOf(fork.mergeInto);
  if (afterIdx < 0 || mergeIdx <= afterIdx) {
    return [];
  }

  const forkSet = new Set(flattenForkLaneTitles(fork));
  return spine.slice(afterIdx + 1, mergeIdx).filter((title) => !forkSet.has(title));
}

function activeForkLaneCount(fork: RoadmapTrunkFork): number {
  return fork.lanes.filter((lane) => lane.spine.length > 0).length;
}

/** Parallel paths at a fork: fork lanes plus spine-only topics between the anchors. */
function forkParallelBranchCount(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
): number {
  return spineOnlyBetweenForkAnchors(curation, fork).length + activeForkLaneCount(fork);
}

function writeCuratedForkSpine(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
  spine: string[],
): void {
  if (
    curation.trunkSpine?.includes(fork.after) &&
    curation.trunkSpine.includes(fork.mergeInto)
  ) {
    curation.trunkSpine = spine;
    const parallelLaneIndex = parallelLaneIndexForTitle(curation, fork.after);
    if (parallelLaneIndex >= 0) {
      const lane = curation.parallelLanes[parallelLaneIndex]!;
      lane.spine = spine.includes(lane.root) ? [lane.root] : lane.spine;
    }

    return;
  }

  const parallelLaneIndex = parallelLaneIndexForTitle(curation, fork.after);
  if (parallelLaneIndex >= 0) {
    curation.parallelLanes[parallelLaneIndex]!.spine = spine;
    if (curation.trunkSpine) {
      delete curation.trunkSpine;
    }

    return;
  }

  curation.trunkSpine = spine;
}

function appendForkLaneTopicsBeforeMerge(
  curation: RoadmapCuration,
  fork: RoadmapTrunkFork,
  laneTopics: readonly string[],
): boolean {
  const spineList = resolveForkSpineList(curation, fork);
  if (!spineList) {
    return false;
  }

  const trunk = [...spineList];
  const afterIdx = trunk.indexOf(fork.after);
  const mergeIdx = trunk.indexOf(fork.mergeInto);
  if (afterIdx < 0 || mergeIdx <= afterIdx) {
    return false;
  }

  const prefix = trunk.slice(0, afterIdx + 1);
  const suffix = trunk.slice(mergeIdx);
  const occupied = new Set<string>([...prefix, ...suffix]);
  const middle: string[] = [];
  for (const title of [...spineOnlyBetweenForkAnchors(curation, fork), ...laneTopics]) {
    if (occupied.has(title)) {
      continue;
    }

    middle.push(title);
    occupied.add(title);
  }

  writeCuratedForkSpine(curation, fork, [...prefix, ...middle, ...suffix]);
  return true;
}

/**
 * Unir ramas: with two parallel branches, collapse onto the spine; with three or more
 * (fork lanes plus spine-only topics in the fork gap), merge only the clicked lane.
 */
export function mergeTrunkFork(
  curation: RoadmapCuration,
  conceptTitle: string,
): ConceptCurationOpResult {
  const next = structuredClone(curation);
  const laneLocation = findTrunkForkLaneForConcept(next, conceptTitle);
  let fork: RoadmapTrunkFork | undefined;
  let laneIndex: number | undefined;

  if (laneLocation) {
    fork = next.trunkForks![laneLocation.forkIndex]!;
    laneIndex = laneLocation.laneIndex;
  } else {
    fork = next.trunkForks?.find((entry) => entry.after === conceptTitle);
    if (!fork) {
      return { ok: false, error: "merge-fork-not-found" };
    }

    if (forkParallelBranchCount(next, fork) > 2) {
      return { ok: false, error: "merge-fork-pick-lane" };
    }
  }

  const collapseAll = forkParallelBranchCount(next, fork) <= 2;

  if (collapseAll) {
    const mergedTopics = fork.lanes.flatMap((lane) => lane.spine);
    if (!appendForkLaneTopicsBeforeMerge(next, fork, mergedTopics)) {
      return { ok: false, error: "merge-fork-not-found" };
    }

    next.trunkForks = (next.trunkForks ?? []).filter((entry) => entry.after !== fork!.after);
    sanitizeTrunkForkCuration(next);
    return { ok: true, curation: next };
  }

  if (laneIndex === undefined) {
    return { ok: false, error: "merge-fork-pick-lane" };
  }

  const lane = fork.lanes[laneIndex]!;
  const mergedTopics = [...lane.spine];
  const foldIntoIndex = laneIndex > 0 ? laneIndex - 1 : 1;
  const targetLane = fork.lanes[foldIntoIndex];
  if (!targetLane) {
    return { ok: false, error: "merge-fork-not-found" };
  }

  targetLane.spine = [...targetLane.spine, ...mergedTopics];
  if (targetLane.spine.length > 0) {
    targetLane.root = targetLane.spine[0]!;
  }

  fork.lanes = fork.lanes.filter((_, index) => index !== laneIndex);
  fork.lanes = compactForkLanes(fork.lanes);

  if (activeForkLaneCount(fork) === 0) {
    next.trunkForks = (next.trunkForks ?? []).filter((entry) => entry.after !== fork!.after);
  }

  sanitizeTrunkForkCuration(next);
  return { ok: true, curation: next };
}

export function attachSideConcept(
  curation: RoadmapCuration,
  ownerTitle: string,
  branchTitle: string,
): ConceptCurationOpResult {
  if (ownerTitle === branchTitle) {
    return { ok: false, error: "no-branch-owner" };
  }

  const next = structuredClone(curation);

  if ((next.trunkForks ?? []).some((fork) => fork.after === branchTitle)) {
    return { ok: false, error: "side-blocked-fork-anchor" };
  }

  const forkWithMerge = (next.trunkForks ?? []).find((fork) => fork.mergeInto === branchTitle);
  if (forkWithMerge) {
    const trunk = [...(next.trunkSpine ?? [])];
    const mergeIdx = trunk.indexOf(branchTitle);
    const replacement = mergeIdx >= 0 ? trunk[mergeIdx + 1] : undefined;
    if (!replacement) {
      return { ok: false, error: "side-blocked-merge-join" };
    }
    forkWithMerge.mergeInto = replacement;
  }

  return { ok: true, curation: attachConceptAsBranch(next, ownerTitle, branchTitle) };
}

function shiftCompressedTrunkSpinePair(
  curation: RoadmapCuration,
  title: string,
  swapWith: string,
  direction: -1 | 1,
): RoadmapCuration | null {
  const next = structuredClone(curation);
  const spine = compressedTrunkSpineTitles(next);
  const leftIndex = spine.indexOf(title);
  const rightIndex = spine.indexOf(swapWith);
  if (leftIndex < 0 || rightIndex < 0) {
    return null;
  }

  const reordered = [...spine];
  reordered[leftIndex] = swapWith;
  reordered[rightIndex] = title;

  handoffTrunkForkMergeIntoForSwap(next, { title, swapWith }, direction);

  if (!compressedTrunkShiftPreservesForks(next, reordered)) {
    return null;
  }

  if ((next.trunkSpine ?? []).length > 0) {
    next.trunkSpine = reordered;
    const laneIndex = next.parallelLanes.findIndex((lane) =>
      reordered.includes(lane.root) || lane.spine.some((entry) => reordered.includes(entry)),
    );
    if (laneIndex >= 0) {
      const lane = next.parallelLanes[laneIndex]!;
      lane.spine = reordered.includes(lane.root) ? [lane.root] : lane.spine;
    }
    sanitizeTrunkForkCuration(next);
    return next;
  }

  const laneIndex = next.parallelLanes.findIndex((lane) => {
    const laneSpine = lane.spine;
    return (
      laneSpine.length === spine.length &&
      laneSpine.every((entry, index) => entry === spine[index])
    );
  });
  if (laneIndex < 0) {
    return null;
  }

  next.parallelLanes[laneIndex]!.spine = reordered;
  sanitizeTrunkForkCuration(next);
  return next;
}

export function buildExpandedSpineOrderForTest(curation: RoadmapCuration): string[] {
  return buildExpandedSpineOrder(curation);
}

export function shiftTailMergeTargetUpForTest(
  curation: RoadmapCuration,
  title: string,
  swapWith: string,
): RoadmapCuration | null {
  return shiftTailMergeTargetUp(curation, title, swapWith);
}

export function shiftConceptInOrder(
  curation: RoadmapCuration,
  title: string,
  direction: -1 | 1,
): RoadmapCuration | null {
  const expanded = buildExpandedSpineOrder(curation);
  const index = expanded.indexOf(title);
  if (index < 0) {
    return null;
  }

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= expanded.length) {
    return null;
  }

  const swapWith = expanded[targetIndex]!;

  if (direction === -1) {
    const tailShift = shiftTailMergeTargetUp(curation, title, swapWith);
    if (tailShift !== null) {
      return tailShift;
    }
  }

  if (direction === 1 && !titleOnCompressedTrunkSpine(curation, title)) {
    const laneLocation = findTrunkForkLaneForConcept(curation, title);
    const fork =
      laneLocation === null ? undefined : curation.trunkForks?.[laneLocation.forkIndex];
    if (laneLocation && fork) {
      const anchorLaneIndex = forkOpeningAnchorLaneIndex(fork);
      if (anchorLaneIndex >= 0 && laneLocation.laneIndex < anchorLaneIndex) {
        const next = structuredClone(curation);
        if (swapForkLaneWithClosingAnchor(next, title, fork.after)) {
          sanitizeTrunkForkCuration(next);
          return next;
        }
      }
    }
  }

  const crossPartner = crossForkLaneSwapPartner(curation, title, direction, swapWith);
  if (crossPartner) {
    const crossSwapped = structuredClone(curation);
    if (applyCrossForkLaneSwap(crossSwapped, title, crossPartner)) {
      sanitizeTrunkForkCuration(crossSwapped);
      return crossSwapped;
    }
  }

  if (direction === -1 && !titleOnCompressedTrunkSpine(curation, title)) {
    const next = structuredClone(curation);
    if (swapForkLaneWithOpeningAnchor(next, title, swapWith)) {
      sanitizeTrunkForkCuration(next);
      return next;
    }
  }

  if (
    titleOnCompressedTrunkSpine(curation, title) &&
    titleOnCompressedTrunkSpine(curation, swapWith)
  ) {
    const compressedShift = shiftCompressedTrunkSpinePair(
      curation,
      title,
      swapWith,
      direction,
    );
    if (compressedShift !== null) {
      return compressedShift;
    }

  }

  const nextExpanded = [...expanded];
  nextExpanded[index] = swapWith;
  nextExpanded[targetIndex] = title;

  const next = structuredClone(curation);
  if (
    direction === -1 &&
    handoffLaneTopicPastUpstreamMergeAnchor(next, { title, swapWith })
  ) {
    sanitizeTrunkForkCuration(next);
    return next;
  }

  handoffTrunkForkMergeIntoForSwap(next, { title, swapWith }, direction);
  applyExpandedSpineOrder(next, nextExpanded, { title, swapWith });
  handoffTrunkForkMergeIntoForSwap(next, { title, swapWith }, direction);
  sanitizeTrunkForkCuration(next);
  return next;
}

export function canShiftConceptInOrder(
  curation: RoadmapCuration,
  title: string,
  direction: -1 | 1,
): boolean {
  const expanded = buildExpandedSpineOrder(curation);
  const index = expanded.indexOf(title);
  if (index < 0) {
    return false;
  }

  const targetIndex = index + direction;
  return targetIndex >= 0 && targetIndex < expanded.length;
}

export function findTrunkForkForConcept(
  curation: RoadmapCuration,
  title: string,
): RoadmapTrunkFork | undefined {
  if (curation.trunkForks?.some((fork) => fork.after === title)) {
    return curation.trunkForks.find((fork) => fork.after === title);
  }

  const laneLocation = findTrunkForkLaneForConcept(curation, title);
  if (!laneLocation) {
    return undefined;
  }

  return curation.trunkForks?.[laneLocation.forkIndex];
}
