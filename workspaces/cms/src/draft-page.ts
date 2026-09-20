export function nextDraftSlug(pages: ReadonlyArray<{ slug: string }>): string {
  const slugs = new Set(pages.map((page) => page.slug));
  if (!slugs.has("new-page")) {
    return "new-page";
  }

  let index = 2;
  while (slugs.has(`new-page-${index}`)) {
    index += 1;
  }
  return `new-page-${index}`;
}

import { composePageDocument, defaultPageMetadata } from "./page-document";

export function createDraftPageContent(slug: string): string {
  return composePageDocument(defaultPageMetadata(slug), "- \n");
}
