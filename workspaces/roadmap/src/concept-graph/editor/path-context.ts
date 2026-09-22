import type { TrunkPath } from "../path";
import type { SpinePath } from "../segment";
import type { ConceptSubgraph } from "../subgraph";
import { isParallelSegment } from "../traverse";
import { linearEditOrder } from "../traverse";

export type SpinePathContext = {
  readonly pathIndices: TrunkPath;
  readonly path: SpinePath;
  readonly order: readonly string[];
};

function contextsInPath(path: SpinePath, pathIndices: TrunkPath, out: SpinePathContext[]): void {
  out.push({ pathIndices, path, order: linearEditOrder(path) });

  for (let segmentIndex = 0; segmentIndex < path.length; segmentIndex += 1) {
    const segment = path[segmentIndex]!;
    if (!isParallelSegment(segment)) {
      continue;
    }

    for (let laneIndex = 0; laneIndex < segment.lanes.length; laneIndex += 1) {
      contextsInPath(segment.lanes[laneIndex]!, [...pathIndices, segmentIndex, laneIndex], out);
    }
  }
}

export function listSpinePathContexts(subgraph: ConceptSubgraph): SpinePathContext[] {
  const out: SpinePathContext[] = [];
  contextsInPath(subgraph.trunk, [], out);
  return out;
}

export function findSpinePathContextForTitles(
  subgraph: ConceptSubgraph,
  firstTitle: string,
  lastTitle: string,
): SpinePathContext | undefined {
  const matches = listSpinePathContexts(subgraph).filter(
    (context) =>
      context.order.includes(firstTitle) && context.order.includes(lastTitle),
  );

  if (matches.length === 0) {
    return undefined;
  }

  return matches.sort((left, right) => left.order.length - right.order.length)[0];
}
