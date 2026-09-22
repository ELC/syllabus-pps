import type {
  RoadmapCuration,
  RoadmapParallelLane,
  RoadmapTrunkFork,
} from "./curation";

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

function flattenForkLaneTitles(fork: RoadmapTrunkFork): string[] {
  return fork.lanes.flatMap((lane) => lane.spine);
}

function compactForkLanes(lanes: RoadmapParallelLane[]): RoadmapParallelLane[] {
  return lanes.filter((lane) => lane.spine.length > 0);
}

function allForkLaneTitles(curation: RoadmapCuration): Set<string> {
  return new Set(
    (curation.trunkForks ?? []).flatMap((fork) => fork.lanes.flatMap((lane) => lane.spine)),
  );
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
    const spine = [...curation.trunkSpine!];
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

function stripBranchesListedOnCompressedSpine(curation: RoadmapCuration): void {
  const trunk = compressedTrunkSpineTitles(curation);
  const onSpine = new Set(trunk);
  for (const title of onSpine) {
    delete curation.branchOwnerOverrides[title];
  }

  for (const [owner, branches] of Object.entries(curation.branches)) {
    const filtered = branches.filter((entry) => !onSpine.has(entry));
    if (filtered.length === 0) {
      delete curation.branches[owner];
    } else {
      curation.branches[owner] = filtered;
    }
  }
}

/** Keep trunk forks consistent with compressed spine storage (repair edit glitches). */
export function sanitizeTrunkForkCuration(curation: RoadmapCuration): void {
  stripBranchesListedOnCompressedSpine(curation);
  for (const fork of curation.trunkForks ?? []) {
    const stripAfterFromLanes = forkAfterIsSpineOnlyBetweenAnchors(curation, fork);
    for (const lane of fork.lanes) {
      lane.spine = lane.spine.filter(
        (title) => title !== fork.after || !stripAfterFromLanes,
      );
      if (lane.spine.length > 0) {
        lane.root = lane.spine[0]!;
      }
    }
    fork.lanes = compactForkLanes(fork.lanes);
  }

  const laneTitles = allForkLaneTitles(curation);
  const forkAnchorTitles = new Set(
    (curation.trunkForks ?? []).flatMap((fork) => [fork.after, fork.mergeInto]),
  );

  if (curation.trunkSpine) {
    curation.trunkSpine = curation.trunkSpine.filter(
      (title) => !laneTitles.has(title) || forkAnchorTitles.has(title),
    );
    if (
      curation.trunkSpine.length === 0 &&
      (curation.trunkForks ?? []).length > 0
    ) {
      delete curation.trunkSpine;
    }
  }

  for (const lane of curation.parallelLanes) {
    lane.spine = lane.spine.filter(
      (title) => !laneTitles.has(title) || forkAnchorTitles.has(title),
    );
  }

  if ((curation.trunkSpine ?? []).length > 0) {
    for (const fork of curation.trunkForks ?? []) {
      for (const lane of curation.parallelLanes) {
        if (lane.spine.includes(fork.after) || lane.root === fork.after) {
          lane.spine = [fork.after];
        }
      }
    }
  }

  repairMisplacedTailForkAnchors(curation);

  if (curation.trunkForks !== undefined) {
    curation.trunkForks = curation.trunkForks.filter((fork) => {
      if (fork.lanes.length === 0) {
        return false;
      }

      const trunk = compressedTrunkSpineTitles(curation);
      const afterIdx = trunk.indexOf(fork.after);
      const mergeIdx = trunk.indexOf(fork.mergeInto);
      return afterIdx >= 0 && mergeIdx > afterIdx;
    });
  }

}
