import { normalizeTitle } from "@pps/core";

export interface PageLinkOption {
  title: string;
  slug: string;
}

export function filterPageLinks(
  pages: PageLinkOption[],
  query: string,
  excludeTitle?: string,
): PageLinkOption[] {
  const excluded = excludeTitle ? normalizeTitle(excludeTitle) : null;
  const normalized = query.trim().toLowerCase();
  const ranked = pages
    .filter((page) => !excluded || normalizeTitle(page.title) !== excluded)
    .map((page) => {
      const slug = page.slug.toLowerCase();
      const title = page.title.toLowerCase();
      let score = 0;
      if (!normalized) {
        score = 1;
      } else if (title.startsWith(normalized)) {
        score = 5;
      } else if (slug.startsWith(normalized)) {
        score = 4;
      } else if (title.includes(normalized)) {
        score = 3;
      } else if (slug.includes(normalized)) {
        score = 2;
      }
      return { page, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.page.title.localeCompare(right.page.title, "es-AR");
    });

  return ranked.map((item) => item.page);
}
