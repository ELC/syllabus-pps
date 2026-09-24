import { PageKind } from "../types";

export const structuralPageKinds = [
  PageKind.Degree,
  PageKind.Year,
  PageKind.Course,
] as const satisfies readonly PageKind[];

export type StructuralPageKind = (typeof structuralPageKinds)[number];

/** Page kind is degree, year, or course in the structural hierarchy. */
export interface StructuralPageKindRankKnown {
  readonly isStructural: true;
  readonly index: number;
}

/** Page kind is outside the degree → year → course hierarchy. */
export interface StructuralPageKindRankUnknown {
  readonly isStructural: false;
}

export type StructuralPageKindRank = StructuralPageKindRankKnown | StructuralPageKindRankUnknown;

export const NON_STRUCTURAL_PAGE_KIND_RANK: StructuralPageKindRankUnknown = {
  isStructural: false,
};

const structuralKindIndex = new Map<string, number>(
  structuralPageKinds.map((kind, index) => [kind, index]),
);

/** Resolve rank from a kind string (pass `""` when the kind is unknown). */
export function structuralPageKindRank(kind: string): StructuralPageKindRank {
  if (kind.length === 0) {
    return NON_STRUCTURAL_PAGE_KIND_RANK;
  }

  const index = structuralKindIndex.get(kind);
  if (index === undefined) {
    return NON_STRUCTURAL_PAGE_KIND_RANK;
  }

  return { isStructural: true, index };
}

export function structuralPageKindRankForPageKind(kind: PageKind): StructuralPageKindRank {
  return structuralPageKindRank(kind);
}

export const structuralPageKindRankByKind = Object.fromEntries(
  Object.values(PageKind).map((kind) => [kind, structuralPageKindRankForPageKind(kind)]),
) as Record<PageKind, StructuralPageKindRank>;
