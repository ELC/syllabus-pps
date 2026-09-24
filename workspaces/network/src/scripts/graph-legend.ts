import { yearDisplayLabel, type ZettelPage } from "@pps/core";
import { AUSTRAL_GRAPH_TNE, kindStyleForKind, tint } from "@pps/shell/austral-tokens";

import { borderColorForYearIndex, courseMetaForDegree } from "./graph-degree-scope";
import { GRAPH_NODE_KINDS } from "./graph-styles";

interface GraphLegendViewState {
  degreeScopeSlug: string;
  conceptsHidden: boolean;
}

interface GraphLegendDegreeContext {
  pages: ZettelPage[];
}

export interface GraphLegendEntry {
  label: string;
  borderColor: string;
  swatchFill: string;
  dashed?: boolean;
  kind?: "concept";
}

function defaultLegendEntries(): GraphLegendEntry[] {
  const entries: GraphLegendEntry[] = GRAPH_NODE_KINDS.map((item) => ({
    label: item.label,
    borderColor: item.border,
    swatchFill: item.swatchFill,
    kind: item.kind === "concept" ? "concept" : undefined,
  }));

  entries.push({
    label: "TNE",
    borderColor: AUSTRAL_GRAPH_TNE.border,
    swatchFill: AUSTRAL_GRAPH_TNE.swatchFill,
  });

  return entries;
}

function scopedLegendEntries(
  viewState: GraphLegendViewState,
  degreeContext: GraphLegendDegreeContext,
): GraphLegendEntry[] {
  const degreeSlug = viewState.degreeScopeSlug.trim();
  const meta = courseMetaForDegree(degreeContext.pages, degreeSlug);
  const yearIndices = new Set<number>();
  const tneYearIndices = new Set<number>();

  for (const courseMeta of meta.values()) {
    yearIndices.add(courseMeta.yearIndex);
    if (courseMeta.tne) {
      tneYearIndices.add(courseMeta.yearIndex);
    }
  }

  const entries: GraphLegendEntry[] = [...yearIndices]
    .sort((left, right) => left - right)
    .map((yearIndex) => {
      const borderColor = borderColorForYearIndex(yearIndex);
      return {
        label: yearDisplayLabel(yearIndex),
        borderColor,
        swatchFill: tint(borderColor, 0.22),
      };
    });

  for (const yearIndex of [...tneYearIndices].sort((left, right) => left - right)) {
    const borderColor = borderColorForYearIndex(yearIndex);
    entries.push({
      label: `${yearDisplayLabel(yearIndex)} · TNE`,
      borderColor,
      swatchFill: tint(borderColor, 0.22),
      dashed: true,
    });
  }

  if (!viewState.conceptsHidden) {
    const conceptStyle = kindStyleForKind("concept");
    entries.push({
      label: "Concepto",
      borderColor: conceptStyle.border,
      swatchFill: conceptStyle.swatchFill,
      kind: "concept",
    });
  }

  if (entries.length === 0) {
    return defaultLegendEntries();
  }

  return entries;
}

export function legendEntriesForView(
  viewState: GraphLegendViewState,
  degreeContext: GraphLegendDegreeContext | null,
): GraphLegendEntry[] {
  const degreeSlug = viewState.degreeScopeSlug.trim();
  if (!degreeSlug || !degreeContext) {
    return defaultLegendEntries();
  }

  return scopedLegendEntries(viewState, degreeContext);
}

export function updateGraphLegendUI(
  legendRoot: HTMLElement | null,
  viewState: GraphLegendViewState,
  degreeContext: GraphLegendDegreeContext | null,
): void {
  if (!legendRoot) {
    return;
  }

  const entries = legendEntriesForView(viewState, degreeContext);
  legendRoot.replaceChildren();

  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = [
      "graph__legend-item",
      entry.kind === "concept" ? "graph__legend-item--concept" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const swatch = document.createElement("span");
    swatch.className = [
      "graph__legend-swatch",
      entry.dashed ? "graph__legend-swatch--dashed" : "",
      entry.kind === "concept" ? "graph__legend-swatch--concept" : "",
    ]
      .filter(Boolean)
      .join(" ");
    swatch.style.background = entry.swatchFill;
    swatch.style.borderColor = entry.borderColor;

    const label = document.createElement("span");
    label.className = "graph__legend-label";
    label.textContent = entry.label;

    item.append(swatch, label);
    legendRoot.appendChild(item);
  }

  const scoped = Boolean(viewState.degreeScopeSlug.trim());
  legendRoot.setAttribute(
    "aria-label",
    scoped ? "Materias por año en la carrera seleccionada" : "Tipos de nodo",
  );
}
