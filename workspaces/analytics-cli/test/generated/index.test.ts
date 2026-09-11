import { describe, expect, it } from "vitest";
import { normalize, sep } from "node:path";
import {
  GENERATED_DIRECTORY,
  createGeneratedFileMeta,
  parseGeneratedHeaderLine,
  parseGeneratedJsonFile,
  renderGeneratedCommentFile,
  renderGeneratedHeaderLine,
  renderGeneratedJsonFile,
  renderGeneratedMarkdown,
  resolveGeneratedDacDir,
  resolveGeneratedDir,
} from "../../src/generated";

describe("generated directories", () => {
  it("resolves analytics outputs under _generated", () => {
    // Arrange
    const outDir = "/repo/analytics-cli";

    // Act
    const generatedDir = resolveGeneratedDir(outDir);
    const dacDir = resolveGeneratedDacDir(outDir);

    // Assert
    expect(normalize(generatedDir).endsWith(`${GENERATED_DIRECTORY}`)).toBe(true);
    expect(normalize(dacDir).endsWith(`${GENERATED_DIRECTORY}${sep}dac`)).toBe(true);
  });
});

describe("generated file headers", () => {
  it("renders a JSON header line for markdown and json payloads", () => {
    // Arrange
    const meta = createGeneratedFileMeta({
      generator: "generated.test.ts",
      kind: "summary",
      generatedAt: "2026-01-01T00:00:00.000Z",
      docs: "README.md",
    });

    // Act
    const markdown = renderGeneratedMarkdown(meta, "# Title\n");
    const json = renderGeneratedJsonFile(meta, { pages: [] });

    // Assert
    expect(parseGeneratedHeaderLine(markdown)).toEqual(meta);
    expect(parseGeneratedJsonFile<{ pages: [] }>(json).meta).toEqual(meta);
    expect(parseGeneratedJsonFile<{ pages: [] }>(json).payload).toEqual({ pages: [] });
  });

  it("renders comment-prefixed headers for tsx and yaml files", () => {
    // Arrange
    const meta = createGeneratedFileMeta({
      generator: "dac/project.ts:quality.dashboard.tsx",
      kind: "dashboard",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    // Act
    const tsx = renderGeneratedCommentFile(meta, "export default null", "//");
    const yaml = renderGeneratedCommentFile(meta, "key: value", "#");

    // Assert
    expect(tsx.startsWith("// ")).toBe(true);
    expect(yaml.startsWith("# ")).toBe(true);
    expect(parseGeneratedHeaderLine(tsx.replace(/^\/\/ /, ""))).toEqual(meta);
    expect(parseGeneratedHeaderLine(yaml.replace(/^# /, ""))).toEqual(meta);
  });

  it("exposes header-only files as a single JSON line", () => {
    // Arrange
    const meta = createGeneratedFileMeta({
      generator: "dac/project.ts:writeDacProject",
      kind: "readme",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    // Act
    const content = renderGeneratedHeaderLine(meta);

    // Assert
    expect(content.trim()).toBe(JSON.stringify(meta));
  });
});
