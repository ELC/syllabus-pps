import { normalizeTitle } from "../normalize";
import { ExpectedCurriculum } from "../types";

export const defaultAdministrativePages = ["journal", "contents", "templates"];

export interface LoadedConfig {
  path?: string;
  contentDir?: string;
  expected: ExpectedCurriculum;
  expectedCourseTitles: Set<string>;
  expectedYearTitles: Set<string>;
  administrativeTitles: Set<string>;
}

export function createLoadedConfig(
  expected: ExpectedCurriculum,
  options?: { path?: string; contentDir?: string },
): LoadedConfig {
  const administrativePages = expected.administrativePages ?? defaultAdministrativePages;

  return {
    path: options?.path,
    contentDir: options?.contentDir ?? expected.contentDir,
    expected,
    expectedCourseTitles: new Set(
      expected.years.flatMap((year) => year.courses.map(normalizeTitle)),
    ),
    expectedYearTitles: new Set(expected.years.map((year) => normalizeTitle(year.title))),
    administrativeTitles: new Set(administrativePages.map(normalizeTitle)),
  };
}

export function emptyLoadedConfig(): LoadedConfig {
  return createLoadedConfig({ years: [] });
}
