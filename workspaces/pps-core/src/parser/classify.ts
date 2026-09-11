import { ConceptTag, PageKind } from "../types";
import { ParseOptions, RawPage } from "./types";

export function classifyPage(
  page: RawPage,
  tags: ConceptTag[],
  options: ParseOptions,
  conceptTitles: Set<string>,
): PageKind {
  if (page.frontmatterKind) {
    return page.frontmatterKind;
  }

  if (page.normalizedTitle === "lds") {
    return "career";
  }

  if (options.expectedYearTitles?.has(page.normalizedTitle) || /^año \d+$/.test(page.normalizedTitle)) {
    return "year";
  }

  if (options.expectedCourseTitles?.has(page.normalizedTitle)) {
    return "course";
  }

  if (options.administrativeTitles?.has(page.normalizedTitle)) {
    return "administrative";
  }

  if (
    conceptTitles.has(page.normalizedTitle) ||
    tags.some((tag) => tag.normalizedTarget === page.normalizedTitle)
  ) {
    return "concept";
  }

  if (page.blocks.length === 0) {
    return "concept";
  }

  return "unknown";
}
