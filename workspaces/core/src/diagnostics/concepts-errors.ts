import type { Diagnostic, PageRef, ZettelBlock, ZettelPage } from "../types";

const MINIMUM_COURSES_FOR_COVERAGE = 3;

export function conceptMissingKindDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "concept-missing-kind",
    message: `Concept page "${page.title}" must declare kind: concept in frontmatter.`,
    page: page.title,
  };
}

export function conceptNoteWithoutLinkDiagnostic(page: ZettelPage, block: ZettelBlock): Diagnostic {
  return {
    severity: "warning",
    code: "concept-note-without-link",
    message: `Concept page "${page.title}" has a note without any links.`,
    page: page.title,
    line: block.line,
    details: { text: block.text },
  };
}

export function conceptLowCourseCoverageDiagnostic(
  page: ZettelPage,
  courses: ReadonlySet<string>,
): Diagnostic {
  const courseCount = courses.size;
  const courseList = [...courses].sort();
  return {
    severity: "warning",
    code: "concept-low-course-coverage",
    message: `Concept "${page.title}" is referenced by ${courseCount} course(s); target is at least ${MINIMUM_COURSES_FOR_COVERAGE}.`,
    page: page.title,
    details: {
      courseCount,
      minimumCourses: MINIMUM_COURSES_FOR_COVERAGE,
      courses: courseList,
    },
  };
}

export function conceptLinksToNonConceptDiagnostic(
  page: ZettelPage,
  block: ZettelBlock,
  ref: PageRef,
  targetPage: ZettelPage | undefined,
): Diagnostic {
  const target = ref.resolvedTarget ?? ref.target;
  const targetKind = targetPage?.kind ?? "missing";
  return {
    severity: "warning",
    code: "concept-links-to-non-concept",
    message: `Concept page "${page.title}" links to non-concept page "${target}".`,
    page: page.title,
    line: block.line,
    details: { target, targetKind, text: block.text },
  };
}
