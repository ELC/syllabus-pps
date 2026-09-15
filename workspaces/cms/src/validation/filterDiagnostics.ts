import { type Diagnostic, normalizeTitle, parseFrontmatter } from "@pps/core";

export function pageTitleFromEditor(slug: string, content: string): string {
  const parsed = parseFrontmatter(content);
  const title = parsed.data.title;

  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }

  return slug;
}

export function pageContentForSlug(
  slug: string,
  selectedSlug: string,
  content: string,
  allSources: Array<{ path: string; content: string }>,
): string {
  if (slug === selectedSlug) {
    return content;
  }

  return allSources.find((page) => page.path.replace(/\.md$/i, "") === slug)?.content ?? "";
}

export function pageHasDiagnostics(
  diagnostics: Diagnostic[],
  slug: string,
  selectedSlug: string,
  content: string,
  allSources: Array<{ path: string; content: string }>,
): boolean {
  const pageContent = pageContentForSlug(slug, selectedSlug, content, allSources);
  return filterDiagnosticsForPage(diagnostics, slug, pageContent).length > 0;
}

export function filterDiagnosticsForPage(
  diagnostics: Diagnostic[],
  slug: string,
  content: string,
): Diagnostic[] {
  const title = pageTitleFromEditor(slug, content);
  const normalizedSlug = normalizeTitle(slug);
  const normalizedTitle = normalizeTitle(title);

  return diagnostics.filter((diagnostic) => {
    if (!diagnostic.page) {
      return false;
    }

    const normalizedPage = normalizeTitle(diagnostic.page);
    return normalizedPage === normalizedTitle || normalizedPage === normalizedSlug;
  });
}
