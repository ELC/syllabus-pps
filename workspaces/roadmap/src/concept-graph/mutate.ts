import { conceptSegment, parallelSegment, type SpinePath, type SpineSegment } from "./segment";
import { isConceptSegment, isParallelSegment } from "./traverse";

export function clonePath(path: SpinePath): SpineSegment[] {
  return path.map((segment) => {
    if (isConceptSegment(segment)) {
      return { ...segment };
    }

    return {
      ...segment,
      lanes: segment.lanes.map((lane) => clonePath(lane)),
    };
  });
}

export function replacePathAt(
  root: SpinePath,
  pathIndices: readonly number[],
  nextPath: SpinePath,
): SpinePath {
  if (pathIndices.length === 0) {
    return nextPath;
  }

  const [head, ...rest] = pathIndices;
  const segments = clonePath(root);
  const segment = segments[head!];
  if (!segment || !isParallelSegment(segment)) {
    return root;
  }

  const lanes = segment.lanes.map((lane, laneIndex) => {
    if (laneIndex !== rest[0]) {
      return lane;
    }

    if (rest.length === 1) {
      return nextPath;
    }

    return replacePathAt(lane, rest.slice(1), nextPath);
  });

  segments[head!] = { ...segment, lanes };
  return segments;
}

export function mapPathSegments(
  path: SpinePath,
  mapper: (segment: SpineSegment, index: number, path: SpinePath) => SpineSegment,
): SpinePath {
  return path.map((segment, index) => mapper(segment, index, path));
}

export function insertConceptAfter(
  path: SpinePath,
  anchorTitle: string,
  title: string,
): SpinePath {
  const next: SpineSegment[] = [];
  let inserted = false;

  for (const segment of path) {
    next.push(segment);
    if (!inserted && segmentTitle(segment) === anchorTitle) {
      next.push(conceptSegment(title));
      inserted = true;
    }
  }

  if (!inserted) {
    next.push(conceptSegment(title));
  }

  return next;
}

function segmentTitle(segment: SpineSegment): string {
  return isConceptSegment(segment) ? segment.title : segment.after;
}

export function removeConceptFromPath(path: SpinePath, title: string): SpinePath {
  const filtered = path.filter((segment) => {
    if (isConceptSegment(segment)) {
      return segment.title !== title;
    }

    return segment.after !== title && segment.merge !== title;
  });

  return filtered.map((segment) => {
    if (isConceptSegment(segment)) {
      return segment;
    }

    return parallelSegment(
      segment.after,
      segment.merge,
      segment.lanes.map((lane) => removeConceptFromPath(lane, title)),
    );
  });
}
