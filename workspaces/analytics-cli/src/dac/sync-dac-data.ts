import { countDiagnosticsBySeverity, countPagesByKind, sourceCoverageGlobalLabel } from "@pps/core";
import type { DacRowRecord } from "@pps/content";

import { CurriculumGraph, Diagnostic } from "../types";
import { uniqueSorted } from "../normalize";
import {
  collectConceptMapRows,
  collectCourseBlockCoverage,
  collectCourseConceptRows,
  collectPerCourseConceptCoverage,
  collectPerYearConceptCoverage,
  collectSourceCoverageRows,
  summarizeSourceCoverageRows,
} from "./projections";

function row(dataset: string, row_data: Record<string, string>): DacRowRecord {
  return { dataset, row_data };
}

export function buildDacSyncPayload(
  graph: CurriculumGraph,
  diagnostics: Diagnostic[],
): {
  metrics: Record<string, number | string>;
  rows: DacRowRecord[];
} {
  const metrics: Record<string, number | string> = {};
  const rows: DacRowRecord[] = [];

  const errors = countDiagnosticsBySeverity(diagnostics, "error");
  const warnings = countDiagnosticsBySeverity(diagnostics, "warning");
  const expectedCourses = graph.expected.years.flatMap((year) => year.courses).length;

  metrics["quality.pages"] = graph.pages.length;
  metrics["quality.edges"] = graph.edges.length;
  metrics["quality.expected-courses"] = expectedCourses;
  metrics["quality.errors"] = errors;
  metrics["quality.warnings"] = warnings;
  metrics["quality.concept-pages"] = countPagesByKind(graph, "concept");
  metrics["quality.course-pages"] = countPagesByKind(graph, "course");
  metrics["quality.year-pages"] = countPagesByKind(graph, "year");

  for (const diagnostic of diagnostics) {
    rows.push(
      row("quality.diagnostics", {
        severity: diagnostic.severity,
        code: diagnostic.code,
        page: diagnostic.page ?? "",
        line: diagnostic.line?.toString() ?? "",
        message: diagnostic.message,
      }),
    );
  }

  const courseConceptRows = collectCourseConceptRows(graph);
  const linkedConceptCount = uniqueSorted(
    courseConceptRows
      .map(([, , concept]) => concept)
      .filter((concept) => concept !== "(no concept links)"),
  ).length;

  metrics["curriculum-map.expected-years"] = graph.expected.years.length;
  metrics["curriculum-map.expected-courses"] = expectedCourses;
  metrics["curriculum-map.linked-concepts"] = linkedConceptCount;
  metrics["curriculum-map.all-pages"] = graph.pages.length;

  for (const [year, course, concept] of courseConceptRows) {
    rows.push(row("curriculum-map.expected-curriculum", { year, course, concept }));
  }

  const conceptMapRows = collectConceptMapRows(graph);
  const conceptCount = graph.pages.filter((page) => page.kind === "concept").length;
  const sourcedConcepts = new Set(
    conceptMapRows.filter((entry) => entry.sourceType !== "(missing)").map((entry) => entry.concept),
  );
  const sourceLinks = conceptMapRows.filter((entry) => entry.sourceType !== "(missing)").length;

  metrics["concept-map.concepts"] = conceptCount;
  metrics["concept-map.concepts-with-sources"] = sourcedConcepts.size;
  metrics["concept-map.concepts-missing-sources"] = conceptCount - sourcedConcepts.size;
  metrics["concept-map.source-links"] = sourceLinks;

  for (const entry of conceptMapRows) {
    rows.push(
      row("concept-map.concept-sources", {
        concept: entry.concept,
        source_type: entry.sourceType,
        source: entry.source,
        line: entry.line,
      }),
    );
  }

  const courseBlockCoverage = collectCourseBlockCoverage(graph);
  const totalBlocks = courseBlockCoverage.length;
  const coveredBlocks = courseBlockCoverage.filter((block) => block.conceptLinks.length > 0).length;
  const missingBlocks = totalBlocks - coveredBlocks;
  const coveragePercent = totalBlocks === 0 ? 100 : (coveredBlocks / totalBlocks) * 100;

  metrics["concept-coverage.course-notes"] = totalBlocks;
  metrics["concept-coverage.notes-with-concepts"] = coveredBlocks;
  metrics["concept-coverage.missing-concept-links"] = missingBlocks;
  metrics["concept-coverage.coverage-percent"] = coveragePercent.toFixed(2);

  for (const [year, notes, covered, missing, percent] of collectPerYearConceptCoverage(
    graph,
    courseBlockCoverage,
  )) {
    rows.push(
      row("concept-coverage.by-year", {
        year,
        notes,
        covered,
        missing,
        coverage_percent: percent,
      }),
    );
  }

  for (const [course, notes, covered, missing, percent] of collectPerCourseConceptCoverage(
    courseBlockCoverage,
  )) {
    rows.push(
      row("concept-coverage.by-course", {
        course,
        notes,
        covered,
        missing,
        coverage_percent: percent,
      }),
    );
  }

  for (const block of courseBlockCoverage.filter((entry) => entry.conceptLinks.length === 0)) {
    rows.push(
      row("concept-coverage.notes-missing", {
        course: block.course,
        line: block.line.toString(),
        note: block.text,
      }),
    );
  }

  for (const block of courseBlockCoverage.filter((entry) => entry.conceptLinks.length > 0)) {
    rows.push(
      row("concept-coverage.covered-notes", {
        course: block.course,
        line: block.line.toString(),
        concept_links: block.conceptLinks.join(", "),
        note: block.text,
      }),
    );
  }

  const sourceRows = collectSourceCoverageRows(graph);
  const globalSummary = summarizeSourceCoverageRows(sourceRows, "global")[0] ?? [
    sourceCoverageGlobalLabel,
    "0",
    "0",
    "0",
    "0.0",
  ];

  metrics["source-coverage.linked-concept-notes"] = globalSummary[1] ?? "0";
  metrics["source-coverage.notes-with-sources"] = globalSummary[2] ?? "0";
  metrics["source-coverage.missing-source-links"] = globalSummary[3] ?? "0";
  metrics["source-coverage.source-coverage-percent"] = globalSummary[4] ?? "0.0";

  for (const [year, conceptNotes, sourced, missing, percent] of summarizeSourceCoverageRows(
    sourceRows,
    "year",
    graph.expected.years.map((yearEntry) => [yearEntry.title]),
  )) {
    rows.push(
      row("source-coverage.by-year", {
        year,
        concept_notes: conceptNotes,
        sourced,
        missing,
        coverage_percent: percent,
      }),
    );
  }

  for (const [year, course, conceptNotes, sourced, missing, percent] of summarizeSourceCoverageRows(
    sourceRows,
    "course",
    graph.expected.years.flatMap((yearEntry) =>
      yearEntry.courses.map((course) => [yearEntry.title, course]),
    ),
  )) {
    rows.push(
      row("source-coverage.by-course", {
        year,
        course,
        concept_notes: conceptNotes,
        sourced,
        missing,
        coverage_percent: percent,
      }),
    );
  }

  for (const entry of sourceRows) {
    rows.push(
      row("source-coverage.concept-note-sources", {
        year: entry.year,
        course: entry.course,
        concept: entry.concept,
        line: entry.line,
        has_source: entry.hasSource,
        source_links: entry.sourceLinks,
        note: entry.note,
      }),
    );
  }

  return { metrics, rows };
}
