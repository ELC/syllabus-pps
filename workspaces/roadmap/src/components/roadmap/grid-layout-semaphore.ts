import { EDIT_ERROR_MESSAGES } from "@pps/core";
import type { PpsStatusIndicatorOverride } from "@pps/shell/AnalyticsRebuildIndicator";

export const GRID_LAYOUT_UNSAVED_LABEL = "Cambios sin guardar. Usá el ícono de guardar.";

export const GRID_LAYOUT_EDIT_HINT =
  "Arrastrá una materia a otra celda; se ajusta a la grilla y intercambia si está ocupada. Guardá con el ícono de arriba a la derecha (iniciá sesión en producción).";

export const GRID_LAYOUT_SAVED_LABEL = "Grilla guardada en la nube.";

export const CONCEPT_LAYOUT_UNSAVED_LABEL = "Cambios sin guardar en el mapa de temas.";

export const CONCEPT_LAYOUT_EDIT_HINT =
  "Subir/Bajar reordenan la columna; Lateral y A columna usan dos clics; Deshacer/Rehacer (⌘Z). Esc cancela. Guardá con el ícono de guardar.";

export const CONCEPT_LAYOUT_SAVED_LABEL = "Mapa de temas guardado en la nube.";

export function gridLayoutStatusToSemaphore(
  status: string,
): PpsStatusIndicatorOverride | null {
  if (!status) {
    return null;
  }

  if (
    status === GRID_LAYOUT_UNSAVED_LABEL ||
    status === CONCEPT_LAYOUT_UNSAVED_LABEL ||
    status === "Guardando…"
  ) {
    return { phase: "updating", label: status };
  }

  if (status.includes("guardada") || status.includes("guardado") || status.includes("Restablecida")) {
    return { phase: "updated", label: status };
  }

  if (
    status.startsWith("No se pudo") ||
    Object.values(EDIT_ERROR_MESSAGES).includes(status)
  ) {
    return { phase: "unknown", label: status };
  }

  return { phase: "unknown", label: status };
}
