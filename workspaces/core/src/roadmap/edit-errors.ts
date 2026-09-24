export enum EditErrorCode {
  NoBranchOwner = "no-branch-owner",
  NoSpineAnchor = "no-spine-anchor",
  ShiftNoNeighbor = "shift-no-neighbor",
  ConceptNotInSubgraph = "concept-not-in-subgraph",
  CodecInvalidCuration = "codec-invalid-curation",
}

export interface EditError {
  readonly code: EditErrorCode;
}

export const EDIT_ERROR_MESSAGES: Record<EditErrorCode, string> = {
  [EditErrorCode.NoBranchOwner]:
    "No se pudo subir a la columna: el tema no tiene dueño en el mapa (usá Lateral primero).",
  [EditErrorCode.NoSpineAnchor]:
    "No se pudo mover a la columna: no hay un lugar en la columna vertebral para insertarlo.",
  [EditErrorCode.ShiftNoNeighbor]: "Subir/Bajar: no hay otro tema adyacente en este orden.",
  [EditErrorCode.ConceptNotInSubgraph]: "El tema no forma parte de este mapa de conceptos.",
  [EditErrorCode.CodecInvalidCuration]:
    "El layout guardado no se pudo interpretar; revisá el mapa en la base de datos.",
};

export function editErrorMessage(error: EditError): string {
  return EDIT_ERROR_MESSAGES[error.code];
}

export function conceptEditErrorLabel(code: EditErrorCode): string {
  return EDIT_ERROR_MESSAGES[code];
}
