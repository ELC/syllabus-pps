import { describe, expect, it } from "vitest";
import {
  compactResourceCatalogEntry,
  parseResourceCatalogEntries,
  serializeResourceCatalogJson,
  type ResourceCatalogEntry,
} from "@pps/core";

const sample: ResourceCatalogEntry = {
  id: "algoritmo",
  type: "webpage",
  title: "Algoritmo",
  author: [{ literal: "Wikipedia" }, { given: " ", family: "" }],
  publisher: "Wikimedia Foundation",
  issued: { raw: "2026-09-14" },
  accessed: { raw: "  " },
  URL: "https://es.wikipedia.org/wiki/Algoritmo",
  DOI: "",
  genre: "  ",
};

describe("resource catalog serialize", () => {
  it("drops empty optional fields and date-parts-only leftovers", () => {
    expect(compactResourceCatalogEntry(sample)).toEqual({
      id: "algoritmo",
      type: "webpage",
      title: "Algoritmo",
      author: [{ literal: "Wikipedia" }],
      publisher: "Wikimedia Foundation",
      issued: { raw: "2026-09-14" },
      URL: "https://es.wikipedia.org/wiki/Algoritmo",
    });
  });

  it("round-trips compact JSON that parseResourceCatalogEntries can read", () => {
    const json = serializeResourceCatalogJson([sample]);
    expect(json.endsWith("\n")).toBe(true);
    expect(parseResourceCatalogEntries(json)).toEqual([
      {
        id: "algoritmo",
        type: "webpage",
        title: "Algoritmo",
        author: [{ literal: "Wikipedia" }],
        publisher: "Wikimedia Foundation",
        issued: { raw: "2026-09-14" },
        URL: "https://es.wikipedia.org/wiki/Algoritmo",
      },
    ]);
  });
});
