import { buildCurriculumIndexes } from "../analysis";
import { incomingEdgeCounts } from "../graph";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic } from "../types";
import { compareDiagnostics } from "./compare";
import {
  conceptLinksToNonConceptPages,
  conceptLowCourseCoverage,
  conceptMissingKind,
  conceptNotesWithoutLinks,
} from "./concepts";
import { courseWithoutConceptLinks, courseYearDiagnostics } from "./courses";
import { missingExpectedPages } from "./expected";
import {
  administrativeDiagnostics,
  emptyPages,
  orphanDiagnostics,
  nonBulletContentDiagnostics,
  selfLinkDiagnostics,
} from "./pages";
import {
  conceptInsufficientSources,
  conceptMissingBookSource,
  conceptNotesWithoutSourceLinks,
} from "./sources";
import { uuidReferenceDiagnostics } from "./uuid";

export { compareDiagnostics } from "./compare";

export function collectDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const { pagesByTitle: pageByTitle } = buildCurriculumIndexes(graph);
  const incomingCounts = incomingEdgeCounts(graph);
  const expectedCourses = new Set(
    graph.expected.years.flatMap((year) => year.courses.map(normalizeTitle)),
  );
  const expectedYears = new Set(graph.expected.years.map((year) => normalizeTitle(year.title)));

  diagnostics.push(...missingExpectedPages(graph, pageByTitle));
  diagnostics.push(...emptyPages(graph));
  diagnostics.push(...selfLinkDiagnostics(graph));
  diagnostics.push(...nonBulletContentDiagnostics(graph));
  diagnostics.push(...courseWithoutConceptLinks(graph));
  diagnostics.push(...conceptMissingKind(graph));
  diagnostics.push(...conceptNotesWithoutLinks(graph));
  diagnostics.push(...conceptInsufficientSources(graph));
  diagnostics.push(...conceptMissingBookSource(graph));
  diagnostics.push(...conceptNotesWithoutSourceLinks(graph));
  diagnostics.push(...conceptLinksToNonConceptPages(graph));
  diagnostics.push(...conceptLowCourseCoverage(graph));
  diagnostics.push(...uuidReferenceDiagnostics(graph));
  diagnostics.push(...orphanDiagnostics(graph, incomingCounts));
  diagnostics.push(...administrativeDiagnostics(graph));
  diagnostics.push(...courseYearDiagnostics(graph, expectedCourses, expectedYears));

  return diagnostics.sort(compareDiagnostics);
}
