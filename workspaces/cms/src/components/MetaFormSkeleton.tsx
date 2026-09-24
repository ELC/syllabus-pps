import type { ReactElement } from "react";

export function MetaPrimaryStackSkeleton(): ReactElement {
  return (
    <div className="cms__meta-primary-skeleton" aria-hidden="true">
      <span className="u-visually-hidden">Cargando metadatos…</span>
    </div>
  );
}

export function ContentEditorSkeleton(): ReactElement {
  return (
    <div className="cms__content-editor-skeleton" aria-hidden="true">
      <span className="u-visually-hidden">Cargando contenido…</span>
    </div>
  );
}

export function MetaDegreeDisplaySkeleton(): ReactElement {
  return (
    <div
      className="cms__skeleton cms__skeleton--input cms__meta-degree-display-skeleton"
      aria-hidden="true"
    >
      <span className="u-visually-hidden">Cargando carrera…</span>
    </div>
  );
}

export function MetaCatalogLinkRowSkeleton(): ReactElement {
  return (
    <div className="cms__meta-catalog-link-row-skeleton" aria-busy="true">
      <span className="cms__skeleton cms__skeleton--pill" aria-hidden="true" />
      <span className="cms__skeleton cms__skeleton--pill cms__skeleton--pill-wide" aria-hidden="true" />
      <span className="cms__skeleton cms__skeleton--pill" aria-hidden="true" />
      <span className="u-visually-hidden">Cargando enlaces del catálogo…</span>
    </div>
  );
}
