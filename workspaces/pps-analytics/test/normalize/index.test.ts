import { describe, expect, it } from "vitest";
import { isUuid, normalizeTitle, stripMarkdownExtension, uniqueSorted } from "../../src/normalize";

describe("normalizeTitle", () => {
  it("normalizes whitespace and applies Spanish locale lowercasing", () => {
    // Arrange
    const title = "  Programación   I  ";

    // Act
    const normalized = normalizeTitle(title);

    // Assert
    expect(normalized).toBe("programación i");
  });
});

describe("isUuid", () => {
  it("accepts canonical uuid strings", () => {
    // Arrange
    const value = "44444444-4444-4444-8444-444444444444";

    // Act
    const result = isUuid(value);

    // Assert
    expect(result).toBe(true);
  });

  it("rejects non-uuid strings", () => {
    // Arrange
    const value = "programación i";

    // Act
    const result = isUuid(value);

    // Assert
    expect(result).toBe(false);
  });
});

describe("stripMarkdownExtension", () => {
  it("removes a markdown extension from file names", () => {
    // Arrange
    const fileName = "algoritmos.md";

    // Act
    const title = stripMarkdownExtension(fileName);

    // Assert
    expect(title).toBe("algoritmos");
  });
});

describe("uniqueSorted", () => {
  it("deduplicates values and sorts them with Spanish locale rules", () => {
    // Arrange
    const values = ["programación i", "algoritmos", "programación i", "año 1"];

    // Act
    const sorted = uniqueSorted(values);

    // Assert
    expect(sorted).toEqual(["algoritmos", "año 1", "programación i"]);
  });
});
