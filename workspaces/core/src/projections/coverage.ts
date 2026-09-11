import { buildCurriculumIndexes } from "../analysis/indexes";
import { normalizeTitle, uniqueSorted } from "../normalize";
import { CurriculumGraph } from "../types";

export function countPagesByKind(graph: CurriculumGraph, kind: string): number {
  return graph.pages.filter((page) => page.kind === kind).length;
}

export function collectCourseConceptRows(graph: CurriculumGraph): string[][] {
  const { conceptTitles, yearByCourse } = buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "course")
    .flatMap((page) => {
      const concepts = uniqueSorted([
        ...page.tags.map((tag) => tag.resolvedTarget ?? tag.target),
        ...page.refs
          .filter((ref) => conceptTitles.has(normalizeTitle(ref.resolvedTarget ?? ref.target)))
          .map((ref) => ref.resolvedTarget ?? ref.target),
      ]);

      const year = yearByCourse.get(page.normalizedTitle) ?? "";
      if (concepts.length === 0) {
        return [[year, page.title, "(no concept links)"]];
      }

      return concepts.map((concept) => [year, page.title, concept]);
    })
    .sort(([yearA, courseA, conceptA], [yearB, courseB, conceptB]) => {
      const byYear = yearA.localeCompare(yearB, "es-AR");
      if (byYear !== 0) {
        return byYear;
      }

      const byCourse = courseA.localeCompare(courseB, "es-AR");
      if (byCourse !== 0) {
        return byCourse;
      }

      return conceptA.localeCompare(conceptB, "es-AR");
    });
}

export function collectCourseBlockCoverage(graph: CurriculumGraph): Array<{
  course: string;
  line: number;
  text: string;
  conceptLinks: string[];
}> {
  const { conceptTitles } = buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "course")
    .flatMap((page) =>
      page.blocks.map((block) => {
        const conceptLinks = uniqueSorted([
          ...block.tags.map((tag) => tag.resolvedTarget ?? tag.target),
          ...block.refs
            .filter((ref) => conceptTitles.has(normalizeTitle(ref.resolvedTarget ?? ref.target)))
            .map((ref) => ref.resolvedTarget ?? ref.target),
        ]);

        return {
          course: page.title,
          line: block.line,
          text: block.text,
          conceptLinks,
        };
      }),
    );
}

export function collectPerCourseConceptCoverage(
  blocks: ReturnType<typeof collectCourseBlockCoverage>,
): string[][] {
  const byCourse = blocks.reduce((courses, block) => {
    const stats = courses.get(block.course) ?? { total: 0, covered: 0 };
    stats.total += 1;
    if (block.conceptLinks.length > 0) {
      stats.covered += 1;
    }
    courses.set(block.course, stats);
    return courses;
  }, new Map<string, { total: number; covered: number }>());

  return Array.from(byCourse)
    .map(([course, stats]) => {
      const missing = stats.total - stats.covered;
      const coverage = stats.total === 0 ? 100 : (stats.covered / stats.total) * 100;
      return [
        course,
        stats.total.toString(),
        stats.covered.toString(),
        missing.toString(),
        coverage.toFixed(1),
      ];
    })
    .sort(([a], [b]) => a.localeCompare(b, "es-AR"));
}

export function collectPerYearConceptCoverage(
  graph: CurriculumGraph,
  blocks: ReturnType<typeof collectCourseBlockCoverage>,
): string[][] {
  const { yearByCourse } = buildCurriculumIndexes(graph);
  const byYear = new Map<string, { total: number; covered: number }>(
    graph.expected.years.map((year) => [year.title, { total: 0, covered: 0 }] as const),
  );

  for (const block of blocks) {
    const year = yearByCourse.get(normalizeTitle(block.course)) ?? "(unmapped)";
    const stats = byYear.get(year) ?? { total: 0, covered: 0 };
    stats.total += 1;
    if (block.conceptLinks.length > 0) {
      stats.covered += 1;
    }
    byYear.set(year, stats);
  }

  return Array.from(byYear)
    .map(([year, stats]) => {
      const missing = stats.total - stats.covered;
      const coverage = stats.total === 0 ? 100 : (stats.covered / stats.total) * 100;
      return [
        year,
        stats.total.toString(),
        stats.covered.toString(),
        missing.toString(),
        coverage.toFixed(1),
      ];
    })
    .sort(([yearA], [yearB]) => yearA.localeCompare(yearB, "es-AR"));
}
