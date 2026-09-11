import { describe, expect, it } from "vitest";
import { parsePages } from "@pps/core";
import { readPageSources } from "../../src/content/read-pages";
import {
  FIXTURE_CONTENT_DIR,
  expectedPageKinds,
  fixtureConfig,
} from "../support/fixtures";

describe("parsePages", () => {
  it("classifies fixture pages and normalizes titles from content", () => {
    const config = fixtureConfig();
    const pages = parsePages(readPageSources(FIXTURE_CONTENT_DIR), {
      expectedCourseTitles: config.expectedCourseTitles,
      expectedYearTitles: config.expectedYearTitles,
      administrativeTitles: config.administrativeTitles,
    });

    const kinds = new Map(pages.map((page) => [page.title, page.kind]));
    for (const [title, kind] of expectedPageKinds) {
      expect(kinds.get(title)).toBe(kind);
    }
  });

  it("assigns slugs from filenames", () => {
    const config = fixtureConfig();
    const pages = parsePages(readPageSources(FIXTURE_CONTENT_DIR), {
      expectedCourseTitles: config.expectedCourseTitles,
      expectedYearTitles: config.expectedYearTitles,
      administrativeTitles: config.administrativeTitles,
    });

    expect(pages.find((page) => page.title === "programación i")?.slug).toBe("programacion-i");
  });
});
