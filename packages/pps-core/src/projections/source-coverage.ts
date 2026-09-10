import { buildCurriculumIndexes } from "../analysis/indexes";
import { collectSourcesForBlock } from "../analysis/sources";
import { normalizeTitle, uniqueSorted } from "../normalize";
import { CurriculumGraph } from "../types";

export interface SourceCoverageRow {
  year: string;
  course: string;
  concept: string;
  line: string;
  hasSource: string;
  sourceLinks: string;
  note: string;
}

export function collectSourceCoverageRows(graph: CurriculumGraph): SourceCoverageRow[] {
  const { conceptPagesByTitle, conceptTitles, curriculumTitles, yearByCourse } =
    buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "course")
    .flatMap((coursePage) => {
      const year = yearByCourse.get(coursePage.normalizedTitle) ?? "(unmapped)";
      const linkedConceptKeys = uniqueSorted([
        ...coursePage.tags.map((tag) => normalizeTitle(tag.resolvedTarget ?? tag.target)),
        ...coursePage.refs
          .map((ref) => normalizeTitle(ref.resolvedTarget ?? ref.target))
          .filter((target) => conceptTitles.has(target)),
      ]);

      return linkedConceptKeys.flatMap((conceptKey) => {
        const conceptPage = conceptPagesByTitle.get(conceptKey);
        if (!conceptPage) {
          return [];
        }

        return conceptPage.blocks.map((block) => {
          const sources = collectSourcesForBlock(conceptPage, block, curriculumTitles);

          return {
            year,
            course: coursePage.title,
            concept: conceptPage.title,
            line: block.line.toString(),
            hasSource: sources.length > 0 ? "yes" : "no",
            sourceLinks: sources.join(", "),
            note: block.text,
          };
        });
      });
    })
    .sort((a, b) => {
      const byYear = a.year.localeCompare(b.year, "es-AR");
      if (byYear !== 0) {
        return byYear;
      }

      const byCourse = a.course.localeCompare(b.course, "es-AR");
      if (byCourse !== 0) {
        return byCourse;
      }

      const byConcept = a.concept.localeCompare(b.concept, "es-AR");
      if (byConcept !== 0) {
        return byConcept;
      }

      return Number(a.line) - Number(b.line);
    });
}

export function summarizeSourceCoverageRows(
  rows: SourceCoverageRow[],
  groupBy: "global" | "year" | "course",
  seedLabels: string[][] = [],
): string[][] {
  const groups = new Map<string, { labels: string[]; rows: Map<string, SourceCoverageRow> }>();

  for (const labels of seedLabels) {
    groups.set(labels.join("\u0000"), { labels, rows: new Map<string, SourceCoverageRow>() });
  }

  for (const row of rows) {
    const labels =
      groupBy === "global" ? ["All"] : groupBy === "year" ? [row.year] : [row.year, row.course];
    const groupKey = labels.join("\u0000");
    const rowKey =
      groupBy === "global"
        ? `${row.concept}\u0000${row.line}`
        : groupBy === "year"
          ? `${row.year}\u0000${row.concept}\u0000${row.line}`
          : `${row.course}\u0000${row.concept}\u0000${row.line}`;
    const group = groups.get(groupKey) ?? { labels, rows: new Map<string, SourceCoverageRow>() };
    group.rows.set(rowKey, row);
    groups.set(groupKey, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const groupRows = Array.from(group.rows.values());
      const total = groupRows.length;
      const sourced = groupRows.filter((row) => row.hasSource === "yes").length;
      const missing = total - sourced;
      const coverage = total === 0 ? 0 : (sourced / total) * 100;

      return [
        ...group.labels,
        total.toString(),
        sourced.toString(),
        missing.toString(),
        coverage.toFixed(1),
      ];
    })
    .sort((a, b) => {
      const first = a[0].localeCompare(b[0], "es-AR");
      if (first !== 0) {
        return first;
      }

      return (a[1] ?? "").localeCompare(b[1] ?? "", "es-AR");
    });
}
