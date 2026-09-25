import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type RoadmapStatus = "pending" | "done" | "skipped";

export const ROADMAP_STATUS_CYCLE: RoadmapStatus[] = ["pending", "done", "skipped"];

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  pending: "Pendiente",
  done: "Hecho",
  skipped: "Omitido",
};

export interface RoadmapProgressCounts {
  done: number;
  skipped: number;
  total: number;
}

export interface RoadmapConceptProgress {
  status: RoadmapStatus;
  done: number;
  skipped: number;
  total: number;
  /** Done over remaining resources (total minus omitted). */
  percent: number;
}

export type RoadmapCourseProgress = RoadmapConceptProgress;

/** Done over remaining (total minus omitted). All omitted → 0. */
export function remainingProgressPercent(done: number, total: number, skipped: number): number {
  const remaining = total - skipped;
  return remaining <= 0 ? 0 : Math.round((done / remaining) * 100);
}

export function deriveConceptProgress(
  resourceLines: readonly number[],
  resourceStatuses: Readonly<Record<string, RoadmapStatus>>,
): RoadmapConceptProgress {
  const total = resourceLines.length;
  if (total === 0) {
    return { status: "pending", done: 0, skipped: 0, total: 0, percent: 0 };
  }

  let done = 0;
  let skipped = 0;

  for (const line of resourceLines) {
    switch (normalizeStatus(resourceStatuses[String(line)])) {
      case "done":
        done += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
      default:
        break;
    }
  }

  const pending = total - done - skipped;

  if (skipped === total) {
    return { status: "skipped", done, skipped, total, percent: 0 };
  }

  if (done >= 1 && pending === 0) {
    return { status: "done", done, skipped, total, percent: 100 };
  }

  return {
    status: "pending",
    done,
    skipped,
    total,
    percent: remainingProgressPercent(done, total, skipped),
  };
}

/** A course is completed when every linked concept is completed. */
export function deriveCourseProgress(
  conceptTitles: readonly string[],
  conceptProgressFor: (title: string) => RoadmapConceptProgress,
): RoadmapCourseProgress {
  const total = conceptTitles.length;
  if (total === 0) {
    return { status: "pending", done: 0, skipped: 0, total: 0, percent: 0 };
  }

  let done = 0;
  let skipped = 0;

  for (const title of conceptTitles) {
    switch (conceptProgressFor(title).status) {
      case "done":
        done += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
      default:
        break;
    }
  }

  const pending = total - done - skipped;

  if (skipped === total) {
    return { status: "skipped", done, skipped, total, percent: 0 };
  }

  if (done === total) {
    return { status: "done", done, skipped, total, percent: 100 };
  }

  return {
    status: "pending",
    done,
    skipped,
    total,
    percent: remainingProgressPercent(done, total, skipped),
  };
}

export function tallyStatuses(
  titles: readonly string[],
  statusFor: (title: string) => RoadmapStatus,
): RoadmapProgressCounts {
  const tally: RoadmapProgressCounts = {
    done: 0,
    skipped: 0,
    total: titles.length,
  };

  for (const title of titles) {
    switch (statusFor(title)) {
      case "done":
        tally.done += 1;
        break;
      case "skipped":
        tally.skipped += 1;
        break;
      default:
        break;
    }
  }

  return tally;
}

export interface RoadmapProgress {
  statusFor: (title: string) => RoadmapStatus;
  conceptProgressFor: (title: string) => RoadmapConceptProgress;
  courseProgressFor: (courseTitle: string) => RoadmapCourseProgress;
  resourceStatusFor: (slug: string, line: number) => RoadmapStatus;
  toggleResourceDone: (slug: string, line: number) => void;
  toggleResourceSkipped: (slug: string, line: number) => void;
  reset: (options?: { courseTitle?: string }) => void;
  counts: RoadmapProgressCounts;
}

type ResourceProgressStore = Record<string, Record<string, Record<string, RoadmapStatus>>>;

const STORAGE_KEY = "pps:roadmap-resource-progress:v1";
const EMPTY_DEGREE: Record<string, Record<string, RoadmapStatus>> = {};
const EMPTY_RESOURCE_STATUSES: Record<string, RoadmapStatus> = {};

export const RoadmapProgressContext = createContext<RoadmapProgress | null>(null);

export function useRoadmapProgressContext(): RoadmapProgress | null {
  return useContext(RoadmapProgressContext);
}

function readStore(): ResourceProgressStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResourceProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ResourceProgressStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Progress is a convenience; a blocked or full storage should not break the roadmap.
  }
}

function normalizeStatus(status: unknown): RoadmapStatus {
  if (status === "done" || status === "skipped") {
    return status;
  }

  return "pending";
}

function applyResourceStatus(
  current: ResourceProgressStore,
  degreeSlug: string,
  slug: string,
  line: number,
  updated: RoadmapStatus,
): ResourceProgressStore {
  const degree = current[degreeSlug] ?? {};
  const conceptResources = degree[slug] ?? {};
  const resourceKey = String(line);
  const { [resourceKey]: _dropped, ...restResources } = conceptResources;

  const nextConceptResources =
    updated === "pending" ? restResources : { ...restResources, [resourceKey]: updated };

  const { [slug]: _droppedConcept, ...restDegree } = degree;

  return {
    ...current,
    [degreeSlug]:
      Object.keys(nextConceptResources).length === 0
        ? restDegree
        : { ...restDegree, [slug]: nextConceptResources },
  };
}

function resourceLinesForSlug(
  slug: string,
  resourceLinesBySlug: Map<string, readonly number[]>,
): readonly number[] {
  return resourceLinesBySlug.get(slug) ?? [];
}

/**
 * Tracks per-degree resource progress in localStorage. Concept status is derived from its
 * resources: all omitted → omitted; at least one done and the rest done/omitted → completed.
 */
export function useRoadmapProgress(
  degreeSlug: string,
  slugByTitle: Map<string, string>,
  resourceLinesBySlug: Map<string, readonly number[]>,
  courseConceptsByTitle?: Map<string, readonly string[]>,
): RoadmapProgress {
  const [store, setStore] = useState<ResourceProgressStore>(readStore);

  useEffect(() => {
    writeStore(store);
  }, [store]);

  const degreeResources = store[degreeSlug] ?? EMPTY_DEGREE;

  const resourceStatusFor = useCallback(
    (slug: string, line: number): RoadmapStatus => {
      return normalizeStatus(degreeResources[slug]?.[String(line)]);
    },
    [degreeResources],
  );

  const conceptProgressFor = useCallback(
    (title: string): RoadmapConceptProgress => {
      const slug = slugByTitle.get(title);
      if (!slug) {
        return { status: "pending", done: 0, skipped: 0, total: 0, percent: 0 };
      }

      return deriveConceptProgress(
        resourceLinesForSlug(slug, resourceLinesBySlug),
        degreeResources[slug] ?? EMPTY_RESOURCE_STATUSES,
      );
    },
    [degreeResources, resourceLinesBySlug, slugByTitle],
  );

  const statusFor = useCallback(
    (title: string): RoadmapStatus => conceptProgressFor(title).status,
    [conceptProgressFor],
  );

  const courseProgressFor = useCallback(
    (courseTitle: string): RoadmapCourseProgress => {
      const concepts = courseConceptsByTitle?.get(courseTitle) ?? [];
      return deriveCourseProgress(concepts, conceptProgressFor);
    },
    [conceptProgressFor, courseConceptsByTitle],
  );

  const toggleResourceDone = useCallback(
    (slug: string, line: number) => {
      if (!degreeSlug || !slug) {
        return;
      }

      setStore((current) => {
        const currentStatus = normalizeStatus(current[degreeSlug]?.[slug]?.[String(line)]);
        const updated = currentStatus === "done" ? "pending" : "done";
        return applyResourceStatus(current, degreeSlug, slug, line, updated);
      });
    },
    [degreeSlug],
  );

  const toggleResourceSkipped = useCallback(
    (slug: string, line: number) => {
      if (!degreeSlug || !slug) {
        return;
      }

      setStore((current) => {
        const currentStatus = normalizeStatus(current[degreeSlug]?.[slug]?.[String(line)]);
        const updated = currentStatus === "skipped" ? "pending" : "skipped";
        return applyResourceStatus(current, degreeSlug, slug, line, updated);
      });
    },
    [degreeSlug],
  );

  const reset = useCallback(
    (options?: { courseTitle?: string }) => {
      const courseTitle = options?.courseTitle?.trim();
      if (!courseTitle) {
        setStore((current) => {
          const { [degreeSlug]: _dropped, ...rest } = current;
          return rest;
        });
        return;
      }

      const conceptTitles = courseConceptsByTitle?.get(courseTitle) ?? [];
      const conceptSlugs = new Set(
        conceptTitles
          .map((title) => slugByTitle.get(title))
          .filter((slug): slug is string => Boolean(slug)),
      );

      if (conceptSlugs.size === 0) {
        return;
      }

      setStore((current) => {
        const degree = current[degreeSlug];
        if (!degree) {
          return current;
        }

        let changed = false;
        const nextDegree: Record<string, Record<string, RoadmapStatus>> = {};

        for (const [slug, resources] of Object.entries(degree)) {
          if (conceptSlugs.has(slug)) {
            changed = true;
            continue;
          }
          nextDegree[slug] = resources;
        }

        if (!changed) {
          return current;
        }

        if (Object.keys(nextDegree).length === 0) {
          const { [degreeSlug]: _dropped, ...rest } = current;
          return rest;
        }

        return { ...current, [degreeSlug]: nextDegree };
      });
    },
    [courseConceptsByTitle, degreeSlug, slugByTitle],
  );

  const counts = useMemo(() => {
    const tally: RoadmapProgressCounts = {
      done: 0,
      skipped: 0,
      total: slugByTitle.size,
    };

    for (const title of slugByTitle.keys()) {
      switch (conceptProgressFor(title).status) {
        case "done":
          tally.done += 1;
          break;
        case "skipped":
          tally.skipped += 1;
          break;
        default:
          break;
      }
    }

    return tally;
  }, [conceptProgressFor, slugByTitle]);

  return useMemo(
    () => ({
      statusFor,
      conceptProgressFor,
      courseProgressFor,
      resourceStatusFor,
      toggleResourceDone,
      toggleResourceSkipped,
      reset,
      counts,
    }),
    [
      conceptProgressFor,
      counts,
      courseProgressFor,
      reset,
      resourceStatusFor,
      statusFor,
      toggleResourceDone,
      toggleResourceSkipped,
    ],
  );
}
