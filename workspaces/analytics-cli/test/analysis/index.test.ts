import { describe, expect, it } from "vitest";
import {
  collectPageSources,
  collectSourcesForBlock,
  hasSourceCue,
  buildCurriculumIndexes,
} from "../../src/analysis";
import { buildFixtureGraph } from "../support/fixtures";
import type { ZettelPage } from "../../src/types";

describe("buildCurriculumIndexes", () => {
  it("indexes curriculum pages, concepts, and year-by-course mappings", () => {
    // Arrange
    const graph = buildFixtureGraph();

    // Act
    const indexes = buildCurriculumIndexes(graph);

    // Assert
    expect(indexes.pagesByTitle.get("programación i")?.kind).toBe("course");
    expect(indexes.conceptTitles.has("algoritmos")).toBe(true);
    expect(indexes.curriculumTitles.has("año 1")).toBe(true);
    expect(indexes.yearByCourse.get("programación i")).toBe("año 1");
  });
});

describe("collectSourcesForBlock", () => {
  it("collects URLs and non-curriculum references when a source cue is present", () => {
    // Arrange
    const page: ZettelPage = {
      slug: "recursividad",
      title: "recursividad",
      normalizedTitle: "recursividad",
      path: "recursividad.md",
      kind: "concept",
      blocks: [],
      refs: [],
      tags: [],
      urls: [],
    };
    const block = {
      line: 1,
      text: "Según la documentación oficial.",
      refs: [
        {
          raw: "[[docs]]",
          target: "docs",
          normalizedTarget: "docs",
          isUuid: false,
          line: 1,
        },
      ],
      tags: [],
      urls: [{ raw: "https://example.com", target: "https://example.com", line: 1 }],
      citations: [],
    };
    const curriculumTitles = new Set(["año 1"]);

    // Act
    const sources = collectSourcesForBlock(page, block, curriculumTitles);

    // Assert
    expect(hasSourceCue(block.text)).toBe(true);
    expect(sources).toEqual(["docs", "https://example.com"]);
  });
});

describe("collectPageSources", () => {
  it("deduplicates citation ids across all blocks on a page", () => {
    const page: ZettelPage = {
      slug: "algoritmos",
      title: "algoritmos",
      normalizedTitle: "algoritmos",
      path: "algoritmos.md",
      kind: "concept",
      declaredKind: "concept",
      blocks: [
        {
          line: 1,
          text: "referencia wikipedia",
          refs: [],
          tags: [],
          urls: [],
          citations: [{ id: "algoritmo", raw: "[@algoritmo]", line: 1 }],
        },
        {
          line: 2,
          text: "según cs50",
          refs: [],
          tags: [],
          urls: [],
          citations: [
            { id: "asymptotic-notation", raw: "[@asymptotic-notation]", line: 2 },
            { id: "asymptotic-notation", raw: "[@asymptotic-notation]", line: 2 },
          ],
        },
      ],
      refs: [],
      tags: [],
      urls: [],
    };

    expect(collectPageSources(page, new Set())).toEqual([
      "algoritmo",
      "asymptotic-notation",
    ]);
  });
});
