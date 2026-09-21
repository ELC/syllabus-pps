import type { PpsStatusIndicatorOverride } from "@pps/shell/AnalyticsRebuildIndicator";

export const GRID_LAYOUT_UNSAVED_LABEL = "Cambios sin guardar. Usá el ícono de guardar.";

export const GRID_LAYOUT_EDIT_HINT =
  "Arrastrá una materia a otra celda; se ajusta a la grilla y intercambia si está ocupada. Guardá con el ícono de arriba a la derecha (iniciá sesión en producción).";

export const GRID_LAYOUT_SAVED_LABEL = "Grilla guardada en la nube.";

export const CONCEPT_LAYOUT_UNSAVED_LABEL = "Cambios sin guardar en el mapa de temas.";

export const CONCEPT_LAYOUT_EDIT_HINT =
  "Subir/Bajar reordenan; Separar rama y Lateral dos clics; Unir ramas y A columna un clic. Esc cancela. Guardá con el ícono de guardar.";

export const CONCEPT_LAYOUT_SAVED_LABEL = "Mapa de temas guardado en la nube.";

const CONCEPT_EDIT_ERROR_LABELS: Record<string, string> = {
  "no-branch-owner":
    "No se pudo subir a la columna: falta un dueño en el mapa (suele venir de correlativas dependsOn).",
  "no-spine-anchor":
    "No se pudo subir a la columna: no hay un lugar en la columna vertebral para insertarlo.",
  "separate-not-on-spine": "Separar rama: el tema debe estar en la columna vertebral.",
  "separate-no-neighbors":
    "Separar rama: el tramo debe tener un tema anterior y otro posterior en la columna.",
  "separate-same-node": "Separar rama: elegí dos temas distintos.",
  "separate-different-lists":
    "Separar rama: los dos temas deben estar en la misma columna vertebral.",
  "merge-fork-not-found": "Unir ramas: no hay un fork en ese punto del tronco.",
  "merge-fork-pick-lane":
    "Unir ramas: con más de dos ramas, clic en un tema dentro de la rama que querés unir al tronco.",
  "side-blocked-merge-join":
    "Lateral: no se puede mover el nodo de unión del fork sin un sucesor en la columna.",
  "side-blocked-fork-anchor":
    "Lateral: no se puede mover el ancla donde se abre el fork; usá Unir ramas primero.",
};

export function conceptEditErrorLabel(error: string): string {
  return CONCEPT_EDIT_ERROR_LABELS[error] ?? error;
}

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
    status.startsWith("Separar rama:") ||
    Object.values(CONCEPT_EDIT_ERROR_LABELS).includes(status)
  ) {
    return { phase: "unknown", label: status };
  }

  return { phase: "unknown", label: status };
}
