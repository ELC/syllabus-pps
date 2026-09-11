import { buildCurriculumIndexes, isSourceReference } from "../analysis";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic } from "../types";

export function conceptMissingKind(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages
    .filter((page) => page.kind === "concept" && page.declaredKind !== "concept")
    .map((page) => ({
      severity: "error" as const,
      code: "concept-missing-kind",
      message: `Concept page "${page.title}" must declare kind: concept in frontmatter.`,
      page: page.title,
    }));
}

export function conceptNotesWithoutLinks(graph: CurriculumGraph): Diagnostic[] {
  return graph.pages
    .filter((page) => page.kind === "concept")
    .flatMap((page) =>
      page.blocks
        .filter(
          (block) =>
            block.refs.length === 0 &&
            block.tags.length === 0 &&
            block.urls.length === 0,
        )
        .map((block) => ({
          severity: "warning" as const,
          code: "concept-note-without-link",
          message: `Concept page "${page.title}" has a note without any links.`,
          page: page.title,
          line: block.line,
          details: { text: block.text },
        })),
    );
}

export function conceptLowCourseCoverage(graph: CurriculumGraph): Diagnostic[] {
  const minimumCourses = 3;
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const courseTitles = new Set(
    graph.pages.filter((page) => page.kind === "course").map((page) => page.normalizedTitle),
  );
  const coursesByConcept = new Map<string, Set<string>>();

  for (const edge of graph.edges) {
    if (!courseTitles.has(normalizeTitle(edge.source))) {
      continue;
    }

    const target = pagesByTitle.get(normalizeTitle(edge.target));
    if (target?.kind !== "concept") {
      continue;
    }

    const courses = coursesByConcept.get(target.normalizedTitle) ?? new Set<string>();
    courses.add(edge.source);
    coursesByConcept.set(target.normalizedTitle, courses);
  }

  return graph.pages
    .filter((page) => page.kind === "concept")
    .map((page) => ({ page, courses: coursesByConcept.get(page.normalizedTitle) ?? new Set<string>() }))
    .filter(({ courses }) => courses.size > 0 && courses.size < minimumCourses)
    .map(({ page, courses }) => ({
      severity: "warning" as const,
      code: "concept-low-course-coverage",
      message: `Concept "${page.title}" is referenced by ${courses.size} course(s); target is at least ${minimumCourses}.`,
      page: page.title,
      details: { courseCount: courses.size, minimumCourses, courses: Array.from(courses).sort() },
    }));
}

export function conceptLinksToNonConceptPages(graph: CurriculumGraph): Diagnostic[] {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const reported = new Set<string>();

  return graph.pages
    .filter((page) => page.kind === "concept")
    .flatMap((page) =>
      page.blocks.flatMap((block) =>
        block.refs
          .filter((ref) => {
            const target = normalizeTitle(ref.resolvedTarget ?? ref.target);
            const targetPage = pagesByTitle.get(target);
            if (targetPage?.kind === "concept") {
              return false;
            }

            if (isSourceReference(page, block, targetPage, target)) {
              return false;
            }

            return true;
          })
          .filter((ref) => {
            const key = `${page.normalizedTitle}->${normalizeTitle(ref.resolvedTarget ?? ref.target)}`;
            if (reported.has(key)) {
              return false;
            }

            reported.add(key);
            return true;
          })
          .map((ref) => ({
            severity: "warning" as const,
            code: "concept-links-to-non-concept",
            message: `Concept page "${page.title}" links to non-concept page "${ref.resolvedTarget ?? ref.target}".`,
            page: page.title,
            line: ref.line,
            details: {
              target: ref.resolvedTarget ?? ref.target,
              targetKind:
                pagesByTitle.get(normalizeTitle(ref.resolvedTarget ?? ref.target))?.kind ?? "missing",
              text: block.text,
            },
          })),
      ),
    );
}
