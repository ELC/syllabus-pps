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

export function createDraftPageContent(slug: string): string {
  const title = slug.replace(/-/g, " ");
  const updatedAt = new Date().toISOString();

  return `---
title: ${title}
slug: ${slug}
kind: concept
version: 1
updatedAt: ${updatedAt}
---
- 
`;
}
