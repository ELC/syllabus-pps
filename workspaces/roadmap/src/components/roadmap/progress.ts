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

/** Done over remaining (total minus omitted). All omitted → 0. */
export function remainingProgressPercent(done: number, total: number, skipped: number): number {
  const remaining = total - skipped;
  return remaining <= 0 ? 0 : Math.round((done / remaining) * 100);
}

export interface RoadmapProgress {
  statusFor: (title: string) => RoadmapStatus;
  cycle: (title: string) => void;
  reset: () => void;
  counts: RoadmapProgressCounts;
}

type ProgressStore = Record<string, Record<string, RoadmapStatus>>;

const STORAGE_KEY = "pps:roadmap-progress:v1";
const EMPTY_CAREER: Record<string, RoadmapStatus> = {};

export const RoadmapProgressContext = createContext<RoadmapProgress | null>(null);

export function useRoadmapProgressContext(): RoadmapProgress | null {
  return useContext(RoadmapProgressContext);
}

function readStore(): ProgressStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
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

function nextStatus(status: unknown): RoadmapStatus {
  const current = normalizeStatus(status);
  const index = ROADMAP_STATUS_CYCLE.indexOf(current);
  return ROADMAP_STATUS_CYCLE[(index + 1) % ROADMAP_STATUS_CYCLE.length] ?? "pending";
}

/**
 * Tracks per-career topic progress in localStorage, keyed by concept slug so renaming a page
 * title does not lose it.
 */
export function useRoadmapProgress(
  careerSlug: string,
  slugByTitle: Map<string, string>,
): RoadmapProgress {
  const [store, setStore] = useState<ProgressStore>(readStore);

  useEffect(() => {
    writeStore(store);
  }, [store]);

  const careerStatuses = store[careerSlug] ?? EMPTY_CAREER;

  const statusFor = useCallback(
    (title: string): RoadmapStatus => {
      const slug = slugByTitle.get(title);
      return slug ? normalizeStatus(careerStatuses[slug]) : "pending";
    },
    [careerStatuses, slugByTitle],
  );

  const cycle = useCallback(
    (title: string) => {
      const slug = slugByTitle.get(title);
      if (!careerSlug || !slug) {
        return;
      }

      setStore((current) => {
        const career = current[careerSlug] ?? {};
        const updated = nextStatus(career[slug]);
        const { [slug]: _dropped, ...rest } = career;

        return {
          ...current,
          [careerSlug]: updated === "pending" ? rest : { ...rest, [slug]: updated },
        };
      });
    },
    [careerSlug, slugByTitle],
  );

  const reset = useCallback(() => {
    setStore((current) => {
      const { [careerSlug]: _dropped, ...rest } = current;
      return rest;
    });
  }, [careerSlug]);

  const counts = useMemo(() => {
    const tally: RoadmapProgressCounts = {
      done: 0,
      skipped: 0,
      total: slugByTitle.size,
    };

    for (const slug of slugByTitle.values()) {
      switch (normalizeStatus(careerStatuses[slug])) {
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
  }, [careerStatuses, slugByTitle]);

  return useMemo(
    () => ({ statusFor, cycle, reset, counts }),
    [counts, cycle, reset, statusFor],
  );
}
