import {
  collectConceptMapRows,
  collectCourseBlockCoverage,
  collectCourseConceptRows,
  collectPerCourseConceptCoverage,
  collectPerYearConceptCoverage,
  collectSourceCoverageRows,
  countPagesByKind,
  summarizeSourceCoverageRows,
  uniqueSorted,
} from "@pps/core";
import { CurriculumGraph, Diagnostic } from "../types";

export interface StaticMetric {
  name: string;
  description: string;
  value: number | string;
  format?: ",.0f" | ".1f" | ".2f";
}

export interface StaticFilter {
  name: string;
  description: string;
  defaultValue: string;
  options: string[];
}

export interface StaticColumn {
  name: string;
  label: string;
}

export interface StaticTable {
  name: string;
  description: string;
  columns: StaticColumn[];
  rows: Array<Record<string, string | number>>;
}

export interface StaticDashboard {
  id: string;
  name: string;
  description: string;
  metrics: StaticMetric[];
  filters: StaticFilter[];
  tables: StaticTable[];
}

export interface StaticDashboardExport {
  generatedAt: string;
  dashboards: StaticDashboard[];
}

function table(
  name: string,
  description: string,
  columns: StaticColumn[],
  rows: string[][],
): StaticTable {
  return {
    name,
    description,
    columns,
    rows: rows.map((row) =>
      Object.fromEntries(columns.map((column, index) => [column.name, row[index] ?? ""])),
    ),
  };
}

function buildQualityDashboard(graph: CurriculumGraph, diagnostics: Diagnostic[]): StaticDashboard {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  const expectedCourses = graph.expected.years.flatMap((year) => year.courses).length;

  return {
    id: "quality",
    name: "Quality",
    description: "Structural and curricular diagnostics generated from the PPS curriculum mirror",
    metrics: [
      {
        name: "Pages",
        description: "Total parsed pages. Use this as a quick check that content is being read.",
        value: graph.pages.length,
        format: ",.0f",
      },
      {
        name: "Edges",
        description: "Total explicit links and hashtags. Higher values indicate a denser zettelkasten graph.",
        value: graph.edges.length,
        format: ",.0f",
      },
      {
        name: "Expected Courses",
        description: "Courses declared in pps.config.ts. Compare this with course pages and diagnostics.",
        value: expectedCourses,
        format: ",.0f",
      },
      {
        name: "Red Diagnostics",
        description: "Errors that should block confidence in the current graph. Read the Diagnostics table for details.",
        value: errors,
        format: ",.0f",
      },
      {
        name: "Warnings",
        description: "Non-blocking issues that still deserve review. Filter the table below by code or page.",
        value: warnings,
        format: ",.0f",
      },
      {
        name: "Concept Pages",
        description: "Pages classified as concepts. These should contain source links and connect course content.",
        value: countPagesByKind(graph, "concept"),
        format: ",.0f",
      },
      {
        name: "Course Pages",
        description: "Pages classified as courses. These are expected to link forward into concept pages.",
        value: countPagesByKind(graph, "course"),
        format: ",.0f",
      },
      {
        name: "Year Pages",
        description: "Pages classified as curriculum years. These should reference their expected courses.",
        value: countPagesByKind(graph, "year"),
        format: ",.0f",
      },
    ],
    filters: [
      {
        name: "severity",
        description: "Limit diagnostics to errors, warnings, or all severities.",
        defaultValue: "All",
        options: ["All", ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.severity))],
      },
      {
        name: "code",
        description: "Focus on one diagnostic rule, such as missing sources or course pages without concepts.",
        defaultValue: "All",
        options: ["All", ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.code))],
      },
      {
        name: "page",
        description: "Inspect diagnostics affecting one page.",
        defaultValue: "All",
        options: [
          "All",
          ...uniqueSorted(diagnostics.map((diagnostic) => diagnostic.page ?? "").filter(Boolean)),
        ],
      },
    ],
    tables: [
      {
        name: "Diagnostics",
        description:
          "Each row is one generated quality finding. Use severity, code, page, and line to decide what to fix.",
        columns: [
          { name: "severity", label: "Severity" },
          { name: "code", label: "Code" },
          { name: "page", label: "Page" },
          { name: "line", label: "Line" },
          { name: "message", label: "Message" },
        ],
        rows: diagnostics.map((diagnostic) => ({
          severity: diagnostic.severity,
          code: diagnostic.code,
          page: diagnostic.page ?? "",
          line: diagnostic.line ?? "",
          message: diagnostic.message,
        })),
      },
    ],
  };
}

function buildConceptCoverageDashboard(graph: CurriculumGraph): StaticDashboard {
  const courseBlockCoverage = collectCourseBlockCoverage(graph);
  const totalBlocks = courseBlockCoverage.length;
  const coveredBlocks = courseBlockCoverage.filter((block) => block.conceptLinks.length > 0).length;
  const missingBlocks = totalBlocks - coveredBlocks;
  const coveragePercent = totalBlocks === 0 ? 100 : (coveredBlocks / totalBlocks) * 100;

  return {
    id: "concept-coverage",
    name: "Concept Coverage",
    description: "Course-note coverage by explicit concept links",
    metrics: [
      {
        name: "Course Notes",
        description: "Total note blocks found in course pages. This is the denominator for concept coverage.",
        value: totalBlocks,
        format: ",.0f",
      },
      {
        name: "Notes With Concepts",
        description: "Course notes that link to at least one concept through a hashtag or concept page link.",
        value: coveredBlocks,
        format: ",.0f",
      },
      {
        name: "Missing Concept Links",
        description: "Course notes with no explicit concept link. These are candidates for zettelkasten cleanup.",
        value: missingBlocks,
        format: ",.0f",
      },
      {
        name: "Coverage Percent",
        description: "Share of course notes that have at least one concept link. Higher is better.",
        value: Number(coveragePercent.toFixed(1)),
        format: ".1f",
      },
    ],
    filters: [],
    tables: [
      table(
        "Coverage by Year",
        "Aggregates notes, covered notes, and missing concept links by configured year.",
        [
          { name: "year", label: "Year" },
          { name: "notes", label: "Notes" },
          { name: "covered", label: "With Concept" },
          { name: "missing", label: "Missing" },
          { name: "coverage_percent", label: "Coverage %" },
        ],
        collectPerYearConceptCoverage(graph, courseBlockCoverage),
      ),
      table(
        "Coverage by Course",
        "Aggregates note coverage per course. Use this to find which courses need concept-link enrichment.",
        [
          { name: "course", label: "Course" },
          { name: "notes", label: "Notes" },
          { name: "covered", label: "With Concept" },
          { name: "missing", label: "Missing" },
          { name: "coverage_percent", label: "Coverage %" },
        ],
        collectPerCourseConceptCoverage(courseBlockCoverage),
      ),
      table(
        "Notes Missing Concept Links",
        "Lists individual course notes without concept links.",
        [
          { name: "course", label: "Course" },
          { name: "line", label: "Line" },
          { name: "note", label: "Note" },
        ],
        courseBlockCoverage
          .filter((block) => block.conceptLinks.length === 0)
          .map((block) => [block.course, block.line.toString(), block.text]),
      ),
      table(
        "Covered Notes",
        "Lists notes that already have concept links.",
        [
          { name: "course", label: "Course" },
          { name: "line", label: "Line" },
          { name: "concept_links", label: "Concept Links" },
          { name: "note", label: "Note" },
        ],
        courseBlockCoverage
          .filter((block) => block.conceptLinks.length > 0)
          .map((block) => [
            block.course,
            block.line.toString(),
            block.conceptLinks.join(", "),
            block.text,
          ]),
      ),
    ],
  };
}

function buildCurriculumMapDashboard(graph: CurriculumGraph): StaticDashboard {
  const courseConceptRows = collectCourseConceptRows(graph);
  const expectedCourseCount = graph.expected.years.flatMap((year) => year.courses).length;
  const linkedConceptCount = uniqueSorted(
    courseConceptRows
      .map(([, , concept]) => concept)
      .filter((concept) => concept !== "(no concept links)"),
  ).length;

  return {
    id: "curriculum-map",
    name: "Curriculum Map",
    description: "Expected years, expected courses, and parsed curriculum pages",
    metrics: [
      {
        name: "Expected Years",
        description: "Number of curriculum years configured for validation.",
        value: graph.expected.years.length,
        format: ",.0f",
      },
      {
        name: "Expected Courses",
        description: "Number of configured courses across all years.",
        value: expectedCourseCount,
        format: ",.0f",
      },
      {
        name: "Unique Linked Concepts",
        description: "Distinct concepts linked from all course pages.",
        value: linkedConceptCount,
        format: ",.0f",
      },
      {
        name: "All Pages",
        description: "Total parsed pages in the mirror, including years, courses, concepts, and other page kinds.",
        value: graph.pages.length,
        format: ",.0f",
      },
    ],
    filters: [
      {
        name: "year",
        description: "Show rows for one configured curriculum year.",
        defaultValue: "All",
        options: ["All", ...graph.expected.years.map((year) => year.title)],
      },
      {
        name: "course",
        description: "Show concept rows for one course.",
        defaultValue: "All",
        options: [
          "All",
          ...uniqueSorted(graph.expected.years.flatMap((year) => year.courses.map((course) => course))),
        ],
      },
      {
        name: "concept",
        description: "Show where a specific concept appears across courses.",
        defaultValue: "All",
        options: ["All", ...uniqueSorted(courseConceptRows.map(([, , concept]) => concept))],
      },
    ],
    tables: [
      table(
        "Expected Curriculum",
        "Read one row as year, course, and concept.",
        [
          { name: "year", label: "Year" },
          { name: "course", label: "Course" },
          { name: "concept", label: "Concept" },
        ],
        courseConceptRows,
      ),
    ],
  };
}

function buildSourceCoverageDashboard(graph: CurriculumGraph): StaticDashboard {
  const rows = collectSourceCoverageRows(graph);
  const globalSummary = summarizeSourceCoverageRows(rows, "global")[0] ?? [
    "All",
    "0",
    "0",
    "0",
    "0.0",
  ];

  return {
    id: "source-coverage",
    name: "Source Coverage",
    description: "Source-link coverage for concept notes reached from course pages",
    metrics: [
      {
        name: "Linked Concept Notes",
        description: "Distinct concept note blocks reachable from all course-linked concepts.",
        value: Number(globalSummary[1] ?? 0),
        format: ",.0f",
      },
      {
        name: "Notes With Sources",
        description: "Reachable concept notes that include at least one detected source link.",
        value: Number(globalSummary[2] ?? 0),
        format: ",.0f",
      },
      {
        name: "Missing Source Links",
        description: "Reachable concept notes without a detected source link.",
        value: Number(globalSummary[3] ?? 0),
        format: ",.0f",
      },
      {
        name: "Source Coverage Percent",
        description: "Share of reachable concept notes that have source links. Higher is better.",
        value: Number(globalSummary[4] ?? 0),
        format: ".1f",
      },
    ],
    filters: [],
    tables: [
      table(
        "Source Coverage by Year",
        "For each year, counts unique concept note blocks linked by that year's courses and how many have sources.",
        [
          { name: "year", label: "Year" },
          { name: "concept_notes", label: "Concept Notes" },
          { name: "sourced", label: "With Source" },
          { name: "missing", label: "Missing Source" },
          { name: "coverage_percent", label: "Coverage %" },
        ],
        summarizeSourceCoverageRows(
          rows,
          "year",
          graph.expected.years.map((year) => [year.title]),
        ),
      ),
      table(
        "Source Coverage by Course",
        "For each course, answers how many note blocks from its linked concepts have source links.",
        [
          { name: "year", label: "Year" },
          { name: "course", label: "Course" },
          { name: "concept_notes", label: "Concept Notes" },
          { name: "sourced", label: "With Source" },
          { name: "missing", label: "Missing Source" },
          { name: "coverage_percent", label: "Coverage %" },
        ],
        summarizeSourceCoverageRows(
          rows,
          "course",
          graph.expected.years.flatMap((year) => year.courses.map((course) => [year.title, course])),
        ),
      ),
      table(
        "Concept Note Sources",
        "Each row is one concept note reached from a course.",
        [
          { name: "year", label: "Year" },
          { name: "course", label: "Course" },
          { name: "concept", label: "Concept" },
          { name: "line", label: "Line" },
          { name: "has_source", label: "Has Source" },
          { name: "source_links", label: "Source Links" },
          { name: "note", label: "Note" },
        ],
        rows.map((row) => [
          row.year,
          row.course,
          row.concept,
          row.line,
          row.hasSource,
          row.sourceLinks,
          row.note,
        ]),
      ),
    ],
  };
}

function buildConceptMapDashboard(graph: CurriculumGraph): StaticDashboard {
  const rows = collectConceptMapRows(graph);
  const conceptCount = graph.pages.filter((page) => page.kind === "concept").length;
  const sourcedConcepts = new Set(
    rows.filter((row) => row.sourceType !== "(missing)").map((row) => row.concept),
  );
  const sourceLinks = rows.filter((row) => row.sourceType !== "(missing)").length;

  return {
    id: "concept-map",
    name: "Concept Map",
    description: "Concept pages, their source links, and the courses that use them",
    metrics: [
      {
        name: "Concepts",
        description: "Total concept pages.",
        value: conceptCount,
        format: ",.0f",
      },
      {
        name: "Concepts With Sources",
        description: "Concepts where at least one source link was detected in the prose.",
        value: sourcedConcepts.size,
        format: ",.0f",
      },
      {
        name: "Concepts Missing Sources",
        description: "Concepts with no detected source.",
        value: conceptCount - sourcedConcepts.size,
        format: ",.0f",
      },
      {
        name: "Source Links",
        description: "Total source rows found across concept pages.",
        value: sourceLinks,
        format: ",.0f",
      },
    ],
    filters: [
      {
        name: "source_type",
        description: "Filter sources by URL, documentation, bibliography, article, reference, or missing.",
        defaultValue: "All",
        options: ["All", ...uniqueSorted(rows.map((row) => row.sourceType))],
      },
    ],
    tables: [
      table(
        "Concept Sources",
        "Read each row as concept, detected source type, source value, and source line.",
        [
          { name: "concept", label: "Concept" },
          { name: "source_type", label: "Source Type" },
          { name: "source", label: "Source" },
          { name: "line", label: "Line" },
        ],
        rows.map((row) => [row.concept, row.sourceType, row.source, row.line]),
      ),
    ],
  };
}

export function buildStaticDashboards(
  graph: CurriculumGraph,
  diagnostics: Diagnostic[],
): StaticDashboardExport {
  return {
    generatedAt: graph.generatedAt,
    dashboards: [
      buildQualityDashboard(graph, diagnostics),
      buildConceptCoverageDashboard(graph),
      buildCurriculumMapDashboard(graph),
      buildSourceCoverageDashboard(graph),
      buildConceptMapDashboard(graph),
    ],
  };
}
