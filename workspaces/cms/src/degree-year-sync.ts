import { buildYearPageTitle, buildYearSlug, PageKind } from "@pps/core";
import type { PageSource } from "@pps/core";

import { composePageDocument, splitPageDocument, type PageMetadata } from "./page-document";

export function buildDefaultYearMetadata(
  degreeTitle: string,
  degreeSlug: string,
  yearIndex: number,
  existing?: PageMetadata,
): PageMetadata {
  return {
    title: buildYearPageTitle(degreeTitle, yearIndex),
    fullName: "",
    slug: buildYearSlug(degreeSlug, yearIndex),
    kind: PageKind.Year,
    version: existing?.version ?? 1,
    updatedAt: existing?.updatedAt,
    trayecto: "",
    correlativas: [],
    dependsOn: [],
    degree: degreeTitle,
    yearIndex,
    courses: existing?.courses ?? [],
    yearsCount: undefined,
  };
}

export interface DegreeYearSyncPlan {
  writes: Array<{ slug: string; content: string }>;
  sources: PageSource[];
}

export function planDegreeYearSync(
  degreeMetadata: PageMetadata,
  degreeSlug: string,
  allSources: PageSource[],
): DegreeYearSyncPlan | null {
  if (degreeMetadata.kind !== PageKind.Degree || degreeMetadata.yearsCount === undefined) {
    return null;
  }

  const yearsCount = degreeMetadata.yearsCount;
  if (!Number.isInteger(yearsCount) || yearsCount < 1) {
    return null;
  }

  const writes: Array<{ slug: string; content: string }> = [];
  const sourceBySlug = new Map(
    allSources.map((page) => [page.path.replace(/\.md$/i, ""), page] as const),
  );
  const nextSources = [...allSources];

  for (let yearIndex = 1; yearIndex <= yearsCount; yearIndex += 1) {
    const slug = buildYearSlug(degreeSlug, yearIndex);
    const existingSource = sourceBySlug.get(slug);
    const existingSplit = existingSource ? splitPageDocument(existingSource.content, slug) : undefined;
    const metadata = buildDefaultYearMetadata(
      degreeMetadata.title,
      degreeSlug,
      yearIndex,
      existingSplit?.metadata,
    );
    const body = existingSplit?.body ?? "";
    const content = composePageDocument(metadata, body);

    if (!existingSource || existingSource.content !== content) {
      writes.push({ slug, content });
    }

    const path = `${slug}.md`;
    const index = nextSources.findIndex((page) => page.path.replace(/\.md$/i, "") === slug);
    if (index >= 0) {
      nextSources[index] = { path, content };
    } else {
      nextSources.push({ path, content });
    }
  }

  return { writes, sources: nextSources };
}
