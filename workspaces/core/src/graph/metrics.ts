import { normalizeTitle, uniqueSorted } from "../normalize";
import { CurriculumGraph } from "../types";

export function incomingEdgeCounts(graph: CurriculumGraph): Map<string, number> {
  const counts = new Map<string, number>(graph.pages.map((page) => [page.title, 0]));

  for (const edge of graph.edges) {
    if (normalizeTitle(edge.source) === normalizeTitle(edge.target)) {
      continue;
    }

    counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
  }

  return counts;
}

export function expectedCourseTitles(graph: CurriculumGraph): string[] {
  return uniqueSorted(graph.expected.years.flatMap((year) => year.courses));
}

export function expectedYearTitles(graph: CurriculumGraph): string[] {
  return uniqueSorted(graph.expected.years.map((year) => year.title));
}
