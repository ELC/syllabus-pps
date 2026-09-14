import { describe, expect, it } from "vitest";
import {
  catalogResourceKind,
  catalogSourceType,
  panelResourceKind,
  type ResourceCatalogEntry,
} from "@pps/core";

function entry(partial: Partial<ResourceCatalogEntry> & Pick<ResourceCatalogEntry, "id" | "type" | "title">): ResourceCatalogEntry {
  return {
    author: [{ literal: "Author" }],
    publisher: "Publisher",
    issued: { raw: "2024" },
    accessed: { raw: "2026-09-14" },
    URL: "https://example.com",
    ...partial,
  };
}

describe("catalogResourceKind", () => {
  it("classifies videos from motion_picture type", () => {
    expect(
      catalogResourceKind(
        entry({
          id: "cs50x-2024-lecture-3-algorithms",
          type: "motion_picture",
          title: "CS50x 2024 - Lecture 3 - Algorithms",
        }),
      ),
    ).toBe("video");
  });

  it("classifies books from book type", () => {
    expect(catalogResourceKind(entry({ id: "algorithms", type: "book", title: "Algorithms" }))).toBe(
      "book",
    );
  });

  it("classifies wikipedia from publisher metadata", () => {
    expect(
      catalogResourceKind(
        entry({
          id: "algoritmo",
          type: "webpage",
          title: "Algoritmo",
          publisher: "Wikimedia Foundation",
        }),
      ),
    ).toBe("wikipedia");
  });

  it("classifies interactive tools from genre metadata", () => {
    expect(
      catalogResourceKind(
        entry({
          id: "visualgo",
          type: "webpage",
          title: "VisuAlgo",
          genre: "interactive",
        }),
      ),
    ).toBe("interactive");
  });

  it("classifies courses from genre metadata", () => {
    expect(
      catalogResourceKind(
        entry({
          id: "algorithms-specialization",
          type: "webpage",
          title: "Algorithms",
          genre: "course",
        }),
      ),
    ).toBe("course");
  });

  it("classifies documentation from software type", () => {
    expect(
      catalogResourceKind(
        entry({
          id: "python-tutorial",
          type: "software",
          title: "Python tutorial",
        }),
      ),
    ).toBe("documentation");
  });
});

describe("catalogSourceType", () => {
  it("maps catalog kinds to analytics source types", () => {
    expect(
      catalogSourceType(
        entry({
          id: "acid-properties-in-databases-with-examples",
          type: "motion_picture",
          title: "ACID Properties in Databases With Examples",
        }),
      ),
    ).toBe("video");

    expect(catalogSourceType(entry({ id: "algorithms", type: "book", title: "Algorithms" }))).toBe(
      "bibliography",
    );
  });
});

describe("panelResourceKind", () => {
  it("maps course and documentation entries to text icons", () => {
    expect(
      panelResourceKind(
        entry({
          id: "algorithms-specialization",
          type: "webpage",
          title: "Algorithms",
          genre: "course",
        }),
      ),
    ).toBe("text");

    expect(
      panelResourceKind(
        entry({
          id: "python-tutorial",
          type: "software",
          title: "Python tutorial",
        }),
      ),
    ).toBe("text");
  });
});
