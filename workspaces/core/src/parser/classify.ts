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
    return PageKind.Degree;
  }

  if (options.expectedYearTitles?.has(page.normalizedTitle) || /^año \d+$/.test(page.normalizedTitle)) {
    return PageKind.Year;
  }

  if (options.expectedCourseTitles?.has(page.normalizedTitle)) {
    return PageKind.Course;
  }

  if (options.administrativeTitles?.has(page.normalizedTitle)) {
    return PageKind.Administrative;
  }

  if (
    conceptTitles.has(page.normalizedTitle) ||
    tags.some((tag) => tag.normalizedTarget === page.normalizedTitle)
  ) {
    return PageKind.Concept;
  }

  if (page.blocks.length === 0) {
    return PageKind.Concept;
  }

  return PageKind.Unknown;
}
