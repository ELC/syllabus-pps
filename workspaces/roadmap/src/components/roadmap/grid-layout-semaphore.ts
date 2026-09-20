import type { PpsStatusIndicatorOverride } from "@pps/shell/AnalyticsRebuildIndicator";

export const GRID_LAYOUT_UNSAVED_LABEL = "Cambios sin guardar. Usá el ícono de guardar.";

export const GRID_LAYOUT_EDIT_HINT =
  "Arrastrá una materia a otra celda; se ajusta a la grilla y intercambia si está ocupada. Guardá con el ícono de arriba a la derecha (iniciá sesión en producción).";

export const GRID_LAYOUT_SAVED_LABEL = "Grilla guardada en la nube.";

export function gridLayoutStatusToSemaphore(
  status: string,
): PpsStatusIndicatorOverride | null {
  if (!status) {
    return null;
  }

  if (status === GRID_LAYOUT_UNSAVED_LABEL || status === "Guardando…") {
    return { phase: "updating", label: status };
  }

  if (status.includes("guardada") || status.includes("Restablecida")) {
    return { phase: "updated", label: status };
  }

  return { phase: "unknown", label: status };
}
