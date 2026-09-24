import { loadAnalyticsArtifact } from "@pps/content/browser";
import type { ConceptPage } from "@pps/roadmap/concept-panel";

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

export async function loadConceptPagesBySlug(): Promise<Map<string, ConceptPage>> {
  const loaded = await loadAnalyticsArtifact("curriculum-graph.json");
  const payload =
    typeof loaded === "string"
      ? parseGeneratedPayload<{ pages: ConceptPage[] }>(loaded)
      : (loaded as { pages: ConceptPage[] });
  const pagesBySlug = new Map<string, ConceptPage>();

  for (const page of payload.pages) {
    if (page.kind !== "concept") {
      continue;
    }
    pagesBySlug.set(page.slug, page);
  }

  return pagesBySlug;
}
