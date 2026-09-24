import { normalizeTitle } from "../normalize";
import { CurriculumGraph, ZettelPage, PageKind } from "../types";

export interface CurriculumIndexes {
  pagesByTitle: ReadonlyMap<string, ZettelPage>;
  curriculumTitles: ReadonlySet<string>;
  conceptTitles: ReadonlySet<string>;
  conceptPagesByTitle: ReadonlyMap<string, ZettelPage>;
  yearByCourse: ReadonlyMap<string, string>;
}

export function buildCurriculumIndexes(graph: CurriculumGraph): CurriculumIndexes {
  const pagesByTitle = new Map(graph.pages.map((page) => [page.normalizedTitle, page]));
  const curriculumTitles = new Set(
    graph.pages
      .filter((page) => page.kind === PageKind.Degree || page.kind === PageKind.Course || page.kind === PageKind.Year)
      .map((page) => page.normalizedTitle),
  );
  const conceptPages = graph.pages.filter((page) => page.kind === PageKind.Concept);
  const conceptTitles = new Set(conceptPages.map((page) => page.normalizedTitle));
  const conceptPagesByTitle = new Map(conceptPages.map((page) => [page.normalizedTitle, page]));
  const yearByCourse = new Map(
    graph.expected.years.flatMap((year) =>
      year.courses.map((course) => [normalizeTitle(course), year.title] as const),
    ),
  );

  return {
    pagesByTitle,
    curriculumTitles,
    conceptTitles,
    conceptPagesByTitle,
    yearByCourse,
  };
}
