import { EditErrorCode } from "../errors";
import { EditCommandKind, StorageMode } from "../kinds";
import { replacePathAt } from "../mutate";
import { conceptSegment, parallelSegment, type SpinePath } from "../segment";
import type { TrunkSpineField } from "../subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { allowed, blocked, type SeparateAdmissibility } from "./admissibility";
import type { SeparateCommand } from "./commands";
import { findSpinePathContextForTitles } from "./path-context";

export function planSeparateNative(
  subgraph: ValidatedConceptSubgraph,
  firstTitle: string,
  lastTitle: string,
): SeparateAdmissibility {
  if (firstTitle === lastTitle) {
    return blocked({ code: EditErrorCode.SeparateSameNode });
  }

  const context = findSpinePathContextForTitles(subgraph, firstTitle, lastTitle);
  if (!context) {
    return blocked({ code: EditErrorCode.SeparateDifferentLists });
  }

  const firstIndex = context.order.indexOf(firstTitle);
  const lastIndex = context.order.indexOf(lastTitle);
  if (firstIndex < 0 || lastIndex < 0) {
    return blocked({ code: EditErrorCode.SeparateNotOnSpine });
  }

  if (Math.abs(firstIndex - lastIndex) < 1) {
    return blocked({ code: EditErrorCode.SeparateNoNeighbors });
  }

  return allowed({
    kind: EditCommandKind.Separate,
    firstTitle,
    lastTitle,
  });
}

function listParallelSegments(path: SpinePath) {
  const out: ReturnType<typeof parallelSegment>[] = [];
  for (const segment of path) {
    if (segment.kind === "parallel") {
      out.push(segment);
      for (const lane of segment.lanes) {
        out.push(...listParallelSegments(lane));
      }
    }
  }

  return out;
}

function resolveMergeInto(
  subgraph: ValidatedConceptSubgraph,
  order: readonly string[],
  laterIdx: number,
): string | undefined {
  const lastInRange = order[laterIdx];
  if (lastInRange === undefined) {
    return undefined;
  }

  const downstreamOpensOnLast = listParallelSegments(subgraph.trunk).some(
    (segment) => segment.after === lastInRange,
  );
  if (downstreamOpensOnLast) {
    return lastInRange;
  }

  if (laterIdx + 1 < order.length) {
    return order[laterIdx + 1];
  }

  return lastInRange;
}

function resolveForkAfter(
  subgraph: ValidatedConceptSubgraph,
  order: readonly string[],
  soonerIdx: number,
): string {
  if (soonerIdx === 0) {
    return order[0]!;
  }

  const predecessor = order[soonerIdx - 1]!;
  for (const segment of listParallelSegments(subgraph.trunk)) {
    if (segment.after === predecessor) {
      return segment.merge;
    }
  }

  if (listParallelSegments(subgraph.trunk).some((segment) => segment.merge === predecessor)) {
    return predecessor;
  }

  return predecessor;
}

function buildLanes(rangeTitles: readonly string[], branchLast: string) {
  const others = rangeTitles.filter((title) => title !== branchLast);
  if (others.length === 0) {
    return [[conceptSegment(branchLast)]];
  }

  return [others.map((title) => conceptSegment(title)), [conceptSegment(branchLast)]];
}

function rebuildPathAfterSeparate(
  order: readonly string[],
  soonerIdx: number,
  laterIdx: number,
  forkAfter: string,
  mergeInto: string,
  rangeTitles: readonly string[],
  branchLast: string,
): SpinePath {
  const headTitles = soonerIdx === 0 ? [] : order.slice(0, soonerIdx);
  const tailStart =
    order[laterIdx + 1] === mergeInto ? laterIdx + 2 : laterIdx + 1;
  const tailTitles = order.slice(tailStart);
  const lanes = buildLanes(rangeTitles, branchLast);
  const parallel = parallelSegment(forkAfter, mergeInto, lanes);

  return [
    ...headTitles.map((title) => conceptSegment(title)),
    parallel,
    ...tailTitles.map((title) => conceptSegment(title)),
  ];
}

export function applySeparateNative(
  subgraph: ValidatedConceptSubgraph,
  command: SeparateCommand,
): ValidatedConceptSubgraph {
  const context = findSpinePathContextForTitles(
    subgraph,
    command.firstTitle,
    command.lastTitle,
  );
  if (!context) {
    return subgraph;
  }

  const firstIndex = context.order.indexOf(command.firstTitle);
  const lastIndex = context.order.indexOf(command.lastTitle);
  const soonerIdx = Math.min(firstIndex, lastIndex);
  const laterIdx = Math.max(firstIndex, lastIndex);
  const mergeInto = resolveMergeInto(subgraph, context.order, laterIdx);
  if (!mergeInto) {
    return subgraph;
  }

  const forkAfter = resolveForkAfter(subgraph, context.order, soonerIdx);
  const rangeTitles = context.order.slice(soonerIdx, laterIdx + 1);
  const branchLast = context.order[laterIdx]!;

  const nextPath = rebuildPathAfterSeparate(
    context.order,
    soonerIdx,
    laterIdx,
    forkAfter,
    mergeInto,
    rangeTitles,
    branchLast,
  );

  const trunk =
    context.pathIndices.length === 0
      ? nextPath
      : replacePathAt(subgraph.trunk, context.pathIndices, nextPath);

  const spineJoins = { ...subgraph.meta.spineJoins };
  const branchOwnerOverrides = { ...subgraph.meta.branchOwnerOverrides };
  for (const title of rangeTitles) {
    delete spineJoins[title];
    delete branchOwnerOverrides[title];
  }

  const parallelOnlyMarker = subgraph.meta.trunkSpineField === "empty";
  const trunkSpineField: TrunkSpineField = parallelOnlyMarker ? "empty" : "titles";

  return markValidated({
    ...subgraph,
    trunk,
    meta: {
      ...subgraph.meta,
      storageMode: parallelOnlyMarker ? StorageMode.ParallelOnly : StorageMode.TrunkExplicit,
      trunkSpineField,
      spineJoins,
      branchOwnerOverrides,
      sourceCuration: undefined,
    },
  });
}
