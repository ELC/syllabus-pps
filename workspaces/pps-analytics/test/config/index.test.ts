import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { normalizeTitle } from "../../src/normalize";
import { FIXTURE_CONFIG_PATH, FIXTURE_CONTENT_DIR } from "../support/fixtures";

describe("loadConfig", () => {
  it("returns an empty curriculum when no config path exists", () => {
    const missingPath = "test/fixtures/missing.config.ts";
    const config = loadConfig(missingPath);

    expect(config.expected.years).toEqual([]);
    expect(config.expectedCourseTitles.size).toBe(0);
    expect(config.expectedYearTitles.size).toBe(0);
  });

  it("loads expected years and courses from a TypeScript config file", () => {
    const config = loadConfig(FIXTURE_CONFIG_PATH);

    expect(config.path).toBe(FIXTURE_CONFIG_PATH);
    expect(config.expected.years).toHaveLength(1);
    expect(config.expectedCourseTitles.has(normalizeTitle("programación i"))).toBe(true);
    expect(config.expectedYearTitles.has(normalizeTitle("año 1"))).toBe(true);
    expect(config.contentDir).toBe(FIXTURE_CONTENT_DIR);
  });
});
