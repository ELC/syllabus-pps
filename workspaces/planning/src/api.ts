import {
  DEFAULT_STORAGE_BUCKET,
  fetchAllPageSources,
  fetchPlanningPlan,
  upsertPlanningPlan,
  type PlanningPlanDocument,
} from "@pps/content";
import type { PageSource } from "@pps/core";
import { createBrowserClient } from "@pps/login/client";

const useDevApi = import.meta.env.DEV;

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base.endsWith("/") ? base : `${base}/`}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

export async function loadPageSources(): Promise<PageSource[]> {
  if (useDevApi) {
    const response = await fetch(assetUrl("api/pages/sources"));
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).trim();
      throw new Error(
        detail
          ? `No se pudo cargar el catálogo (${response.status}): ${detail}`
          : `No se pudo cargar el catálogo (${response.status}).`,
      );
    }
    return (await response.json()) as PageSource[];
  }
  return fetchAllPageSources(createBrowserClient(), DEFAULT_STORAGE_BUCKET);
}

export async function loadPlan(courseSlug: string): Promise<PlanningPlanDocument | null> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/planning-plan/${encodeURIComponent(courseSlug)}`));
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`No se pudo cargar el programa (${response.status}).`);
    }
    return (await response.json()) as PlanningPlanDocument;
  }
  return fetchPlanningPlan(createBrowserClient(), courseSlug);
}

export async function savePlan(
  courseSlug: string,
  plan: PlanningPlanDocument,
): Promise<void> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/planning-plan/${encodeURIComponent(courseSlug)}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(plan),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`No se pudo guardar el programa (${response.status}).`);
    }
    return;
  }
  await upsertPlanningPlan(createBrowserClient(), courseSlug, plan);
}
