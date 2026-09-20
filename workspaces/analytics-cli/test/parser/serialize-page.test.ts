import { describe, expect, it } from "vitest";

import { parseFrontmatter, parsePageContent, stringifyPageSource } from "@pps/core";

describe("stringifyPageSource", () => {
  it("round-trips frontmatter and body", () => {
    const body = "- hello [@algoritmo]\n";
    const source = stringifyPageSource(
      {
        title: "algoritmos",
        slug: "algoritmos",
        kind: "concept",
        dependsOn: [],
      },
      body,
    );

    const { data, content } = parseFrontmatter(source);
    expect(data.title).toBe("algoritmos");
    expect(data.kind).toBe("concept");
    expect(content).toBe(body);

    const parsed = parsePageContent({ path: "algoritmos.md", content: source });
    expect(parsed.frontmatterKind).toBe("concept");
    expect(parsed.blocks[0]?.citations[0]?.id).toBe("algoritmo");
  });
});
