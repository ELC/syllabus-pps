import { LocationArea } from "./kinds";
import type { ConceptLocation, TrunkPath } from "./path";
import { SpineSegmentKind } from "./kinds";
import type { ConceptSegment, ParallelSegment, SpinePath, SpineSegment } from "./segment";
import type { ConceptSubgraph } from "./subgraph";

export function isConceptSegment(segment: SpineSegment): segment is ConceptSegment {
  return segment.kind === SpineSegmentKind.Concept;
}

export function isParallelSegment(segment: SpineSegment): segment is ParallelSegment {
  return segment.kind === SpineSegmentKind.Parallel;
}

export function flattenPath(path: SpinePath): string[] {
  const out: string[] = [];
  for (const segment of path) {
    if (isConceptSegment(segment)) {
      out.push(segment.title);
      continue;
    }

    if (!out.includes(segment.after)) {
      out.push(segment.after);
    }

    for (const lane of segment.lanes) {
      for (const title of flattenPath(lane)) {
        if (!out.includes(title)) {
          out.push(title);
        }
      }
    }

    if (!out.includes(segment.merge)) {
      out.push(segment.merge);
    }
  }

  return out;
}

export function flattenSubgraph(subgraph: ConceptSubgraph): string[] {
  const out = flattenPath(subgraph.trunk);
  for (const [owner, branches] of Object.entries(subgraph.laterals)) {
    if (!out.includes(owner)) {
      out.push(owner);
    }
    for (const title of branches) {
      if (!out.includes(title)) {
        out.push(title);
      }
    }
  }

  return out;
}

/** Linear spine order for shift (anchor deduped at fork opens). */
export function linearEditOrder(path: SpinePath): string[] {
  const out: string[] = [];
  for (const segment of path) {
    if (isConceptSegment(segment)) {
      out.push(segment.title);
      continue;
    }

    out.push(segment.after);
    for (const lane of segment.lanes) {
      for (const title of linearEditOrder(lane)) {
        if (title !== segment.after && title !== segment.merge) {
          out.push(title);
        }
      }
    }
    out.push(segment.merge);
  }

  return out;
}

export function linearSubgraphOrder(subgraph: ConceptSubgraph): string[] {
  return linearEditOrder(subgraph.trunk);
}

function findInPath(
  path: SpinePath,
  title: string,
  prefix: TrunkPath,
): ConceptLocation | undefined {
  for (let segmentIndex = 0; segmentIndex < path.length; segmentIndex += 1) {
    const segment = path[segmentIndex]!;
    if (isConceptSegment(segment)) {
      if (segment.title === title) {
        return {
          area: LocationArea.Trunk,
          path: prefix,
          segmentIndex,
          title,
        };
      }

      continue;
    }

    if (segment.after === title) {
      return {
        area: LocationArea.Trunk,
        path: prefix,
        segmentIndex,
        title,
      };
    }

    if (segment.merge === title) {
      return {
        area: LocationArea.Trunk,
        path: prefix,
        segmentIndex,
        title,
      };
    }

    for (let laneIndex = 0; laneIndex < segment.lanes.length; laneIndex += 1) {
      const lane = segment.lanes[laneIndex]!;
      const nested = findInPath(lane, title, [...prefix, segmentIndex, laneIndex]);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

export function findConceptLocation(
  subgraph: ConceptSubgraph,
  title: string,
): ConceptLocation | undefined {
  const trunkHit = findInPath(subgraph.trunk, title, []);
  if (trunkHit) {
    return trunkHit;
  }

  for (const [owner, branches] of Object.entries(subgraph.laterals)) {
    const index = branches.indexOf(title);
    if (index >= 0) {
      return {
        area: LocationArea.Lateral,
        owner,
        index,
        title,
      };
    }
  }

  return undefined;
}
