import { normalizeTitle } from "../normalize";
import { RawPage } from "./types";

export interface PageIndex {
  idToTitle: Map<string, string>;
  titleToCanonical: Map<string, string>;
  slugToCanonical: Map<string, string>;
}

export function buildPageIndex(pages: RawPage[]): PageIndex {
  const idToTitle = new Map<string, string>();
  const titleToCanonical = new Map<string, string>();
  const slugToCanonical = new Map<string, string>();

  for (const page of pages) {
    if (page.id) {
      idToTitle.set(page.id, page.title);
    }
    titleToCanonical.set(page.normalizedTitle, page.title);
    titleToCanonical.set(normalizeTitle(page.title), page.title);
    slugToCanonical.set(normalizeTitle(page.slug), page.title);
  }

  return { idToTitle, titleToCanonical, slugToCanonical };
}

export function resolveLinkTarget(target: string, index: PageIndex): string {
  const normalized = normalizeTitle(target);
  return (
    index.titleToCanonical.get(normalized) ??
    index.slugToCanonical.get(normalized) ??
    target
  );
}
