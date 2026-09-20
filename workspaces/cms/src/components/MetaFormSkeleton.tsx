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
