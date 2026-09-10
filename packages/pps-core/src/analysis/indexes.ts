import { normalizeTitle } from "../normalize";
import { CurriculumGraph, YearTitle, ZettelPage } from "../types";

export interface CurriculumIndexes {
  pagesByTitle: ReadonlyMap<string, ZettelPage>;
  curriculumTitles: ReadonlySet<string>;
  conceptTitles: ReadonlySet<string>;
  conceptPagesByTitle: ReadonlyMap<string, ZettelPage>;
  yearByCourse: ReadonlyMap<string, YearTitle>;
}

export function buildCurriculumIndexes(graph: CurriculumGraph): CurriculumIndexes {
  const pagesByTitle = new Map(graph.pages.map((page) => [page.normalizedTitle, page]));
  const curriculumTitles = new Set(
    graph.pages
      .filter((page) => page.kind === "career" || page.kind === "course" || page.kind === "year")
      .map((page) => page.normalizedTitle),
  );
  const conceptPages = graph.pages.filter((page) => page.kind === "concept");
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
