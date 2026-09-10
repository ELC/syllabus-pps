import { describe, expect, it } from "vitest";
import { collectDiagnostics } from "../../src/diagnostics/index";
import {
  buildFixtureGraph,
  expectedDiagnosticSummaries,
  summarizeDiagnostics,
} from "../support/fixtures";

describe("collectDiagnostics", () => {
  it("collects deterministic diagnostics for the fixture graph", () => {
    // Arrange
    const graph = buildFixtureGraph();

    // Act
    const diagnostics = collectDiagnostics(graph);

    // Assert
    expect(summarizeDiagnostics(diagnostics)).toEqual(expectedDiagnosticSummaries);
  });
});
