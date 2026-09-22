import {
  fetchRoadmapConceptLayout,
  upsertRoadmapConceptLayout,
  type RoadmapConceptLayoutDocument,
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

export async function loadConceptLayout(
  degreeSlug: string,
  courseSlug: string,
): Promise<RoadmapConceptLayoutDocument | null> {
  if (useDevApi) {
    const response = await fetch(
      assetUrl(
        `api/roadmap-concept-layout/${encodeURIComponent(degreeSlug)}/${encodeURIComponent(courseSlug)}`,
      ),
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to load concept layout (${response.status})`);
    }
    const document = (await response.json()) as RoadmapConceptLayoutDocument | null;
    return document;
  }

  return fetchRoadmapConceptLayout(serverClient(), degreeSlug, courseSlug);
}

export async function saveConceptLayout(
  degreeSlug: string,
  courseSlug: string,
  layout: RoadmapConceptLayoutDocument,
): Promise<void> {
  if (useDevApi) {
    const response = await fetch(
      assetUrl(
        `api/roadmap-concept-layout/${encodeURIComponent(degreeSlug)}/${encodeURIComponent(courseSlug)}`,
      ),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(layout),
      },
    );
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to save concept layout (${response.status})`);
    }
    return;
  }

  await upsertRoadmapConceptLayout(serverClient(), degreeSlug, courseSlug, layout);
}
