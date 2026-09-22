import {
  deleteRoadmapCourseLayout,
  fetchRoadmapCourseLayout,
  upsertRoadmapCourseLayout,
  type RoadmapCourseLayoutDocument,
} from "@pps/content";
import { createBrowserClient } from "@pps/login/client";

const useDevApi = import.meta.env.DEV;

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

function serverClient() {
  return createBrowserClient();
}

export async function loadCourseLayout(
  degreeSlug: string,
): Promise<RoadmapCourseLayoutDocument | null> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/roadmap-layout/${encodeURIComponent(degreeSlug)}`));
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to load roadmap layout (${response.status})`);
    }
    return (await response.json()) as RoadmapCourseLayoutDocument;
  }

  return fetchRoadmapCourseLayout(serverClient(), degreeSlug);
}

export async function saveCourseLayout(
  degreeSlug: string,
  layout: RoadmapCourseLayoutDocument,
): Promise<void> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/roadmap-layout/${encodeURIComponent(degreeSlug)}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(layout),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to save roadmap layout (${response.status})`);
    }
    return;
  }

  await upsertRoadmapCourseLayout(serverClient(), degreeSlug, layout);
}

export async function clearCourseLayout(degreeSlug: string): Promise<void> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/roadmap-layout/${encodeURIComponent(degreeSlug)}`), {
      method: "DELETE",
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to clear roadmap layout (${response.status})`);
    }
    return;
  }

  await deleteRoadmapCourseLayout(serverClient(), degreeSlug);
}
