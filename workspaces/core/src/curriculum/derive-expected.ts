import { coursesLinkedToYearPage } from "../degree-year";
import { normalizeTitle } from "../normalize";
import { CurriculumYear, ExpectedCurriculum, ZettelPage, PageKind } from "../types";

function legacyCoursesFromRefs(
  yearPage: ZettelPage,
  pagesByNormalizedTitle: ReadonlyMap<string, ZettelPage>,
): string[] {
  const courses: string[] = [];
  const seen = new Set<string>();

  for (const ref of yearPage.refs) {
    const normalized = normalizeTitle(ref.resolvedTarget ?? ref.target);
    const targetPage = pagesByNormalizedTitle.get(normalized);
    if (targetPage?.kind !== PageKind.Course) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    courses.push(targetPage.title);
  }

  return courses;
}

export function deriveExpectedCurriculum(pages: readonly ZettelPage[]): Pick<ExpectedCurriculum, "years"> {
  const pagesByNormalizedTitle = new Map(pages.map((page) => [page.normalizedTitle, page]));

  const years: CurriculumYear[] = pages
    .filter((page) => page.kind === PageKind.Year)
    .sort((left, right) => {
      const byDegree = (left.degree?.resolvedTarget ?? left.degree?.target ?? "").localeCompare(
        right.degree?.resolvedTarget ?? right.degree?.target ?? "",
        "es-AR",
      );
      if (byDegree !== 0) {
        return byDegree;
      }
      return (left.yearIndex ?? 0) - (right.yearIndex ?? 0);
    })
    .map((yearPage) => {
      const linked = coursesLinkedToYearPage(yearPage, { pages: [...pages], edges: [] });
      const courses =
        linked.length > 0
          ? linked
          : legacyCoursesFromRefs(yearPage, pagesByNormalizedTitle).sort((left, right) =>
              left.localeCompare(right, "es-AR"),
            );

      return {
        title: yearPage.title,
        courses,
      };
    });

  return { years };
}
