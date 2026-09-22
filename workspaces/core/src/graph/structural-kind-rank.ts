import { match } from "ts-pattern";

import { PageKind } from "../types";

export const structuralPageKinds = ["degree", "year", "course"] as const satisfies readonly PageKind[];

export type StructuralPageKind = (typeof structuralPageKinds)[number];

export function structuralPageKindRank(kind: string | undefined): number | undefined {
  return match(kind)
    .with("degree", () => 0)
    .with("year", () => 1)
    .with("course", () => 2)
    .otherwise(() => undefined);
}

export const structuralPageKindRankByKind = Object.fromEntries(
  structuralPageKinds.map((kind, index) => [kind, index]),
) as Partial<Record<PageKind, number>>;
