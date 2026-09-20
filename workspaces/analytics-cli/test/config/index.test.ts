import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { FIXTURE_CONFIG_PATH, FIXTURE_CONTENT_DIR } from "../support/fixtures";

describe("loadConfig", () => {
  it("returns an empty curriculum when no config path exists", () => {
    const missingPath = "test/fixtures/missing.config.ts";
    const config = loadConfig(missingPath);

    expect(config.expected.years).toEqual([]);
    expect(config.expectedCourseTitles.size).toBe(0);
    expect(config.expectedYearTitles.size).toBe(0);
  });

  it("loads contentDir from a config file without a hardcoded curriculum", () => {
    const config = loadConfig(FIXTURE_CONFIG_PATH);

    expect(config.path).toBe(FIXTURE_CONFIG_PATH);
    expect(config.expected.years).toEqual([]);
    expect(config.expectedCourseTitles.size).toBe(0);
    expect(config.expectedYearTitles.size).toBe(0);
    expect(config.contentDir).toBe(FIXTURE_CONTENT_DIR);
  });
});
