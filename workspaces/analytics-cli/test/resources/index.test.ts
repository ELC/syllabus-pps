import { describe, expect, it } from "vitest";
import { indexResourceCatalog, parsePages } from "@pps/core";
import { readPageSources } from "../../src/content/read-pages";
import { readResourceCatalog } from "../../src/content/read-resources";
import { buildGraph } from "../../src/graph";
import { FIXTURE_CONTENT_DIR, FIXTURE_GENERATED_AT_ISO, fixtureConfig } from "../support/fixtures";

describe("resource catalog", () => {
  it("loads fixture catalog entries with strict metadata", () => {
    const catalog = readResourceCatalog(FIXTURE_CONTENT_DIR);

    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((entry) => typeof entry.id === "string" && entry.id.length > 0)).toBe(true);
    expect(catalog.find((entry) => entry.id === "algorithms")?.type).toBe("book");
  });

  it("resolves citation ids on concept blocks when building the graph", () => {
    const graph = buildGraph({
      contentDir: FIXTURE_CONTENT_DIR,
      config: fixtureConfig(),
      generatedAt: FIXTURE_GENERATED_AT_ISO,
    });

    const algoritmos = graph.pages.find((page) => page.slug === "algoritmos");
    expect(algoritmos?.blocks.every((block) => block.citations.length > 0)).toBe(true);
    expect(
      algoritmos?.blocks.every((block) =>
        block.citations.every((citation) => citation.resolved !== undefined),
      ),
    ).toBe(true);
  });

  it("parses [@resource-id] markers from concept bullets", () => {
    const config = fixtureConfig();
    const resources = readResourceCatalog(FIXTURE_CONTENT_DIR);
    const catalog = indexResourceCatalog(resources);
    const pages = parsePages(
      readPageSources(FIXTURE_CONTENT_DIR),
      {
        expectedCourseTitles: config.expectedCourseTitles,
        expectedYearTitles: config.expectedYearTitles,
        administrativeTitles: config.administrativeTitles,
      },
      catalog,
    );

    const algoritmos = pages.find((page) => page.slug === "algoritmos");
    expect(algoritmos?.blocks[0]?.citations).toEqual([
      expect.objectContaining({ id: "algoritmo", resolved: expect.any(Object) }),
    ]);
    expect(algoritmos?.blocks[0]?.text).toContain("[@algoritmo]");
  });
});
