import { describe, expect, it } from "vitest";
import {
  collectPageSources,
  collectSourcesForBlock,
  hasSourceCue,
  buildCurriculumIndexes,
} from "../../src/analysis";
import { normalizeTitle } from "../../src/normalize";
import { buildFixtureGraph } from "../support/fixtures";
import { PageKind, type ZettelPage } from "../../src/types";

describe("buildCurriculumIndexes", () => {
  it("indexes curriculum pages, concepts, and year-by-course mappings", () => {
    // Arrange
    const graph = buildFixtureGraph();

    // Act
    const indexes = buildCurriculumIndexes(graph);

    // Assert
    expect(indexes.pagesByTitle.get("programación i")?.kind).toBe("course");
    expect(indexes.conceptTitles.has("algoritmos")).toBe(true);
    expect(indexes.curriculumTitles.has(normalizeTitle("LDS · año 1"))).toBe(true);
    expect(indexes.yearByCourse.get("algoritmos y estructuras de datos")).toBe("LDS · año 1");
    expect(indexes.yearByCourse.get("programación i")).toBeUndefined();
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
      kind: PageKind.Concept,
      blocks: [],
      refs: [],
      tags: [],
      urls: [],
      citations: [],
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
      kind: PageKind.Concept,
      declaredKind: PageKind.Concept,
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
      citations: [],
    };

    expect(collectPageSources(page, new Set())).toEqual([
      "algoritmo",
      "asymptotic-notation",
    ]);
  });
});
