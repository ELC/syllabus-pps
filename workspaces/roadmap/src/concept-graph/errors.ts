export const EditErrorCode = {
  NoBranchOwner: "no-branch-owner",
  NoSpineAnchor: "no-spine-anchor",
  SeparateNotOnSpine: "separate-not-on-spine",
  SeparateNoNeighbors: "separate-no-neighbors",
  SeparateSameNode: "separate-same-node",
  SeparateDifferentLists: "separate-different-lists",
  ForkLaneNotFound: "fork-lane-not-found",
  MergeForkNotFound: "merge-fork-not-found",
  MergeForkPickLane: "merge-fork-pick-lane",
  SideBlockedMergeJoin: "side-blocked-merge-join",
  SideBlockedForkAnchor: "side-blocked-fork-anchor",
  ShiftNoNeighbor: "shift-no-neighbor",
  ShiftCrossForkBlocked: "shift-cross-fork-blocked",
  ConceptNotInSubgraph: "concept-not-in-subgraph",
  CodecInvalidCuration: "codec-invalid-curation",
} as const;

export type EditErrorCode = (typeof EditErrorCode)[keyof typeof EditErrorCode];

export type EditError = {
  readonly code: EditErrorCode;
};

export const EDIT_ERROR_MESSAGES: Record<EditErrorCode, string> = {
  [EditErrorCode.NoBranchOwner]:
    "No se pudo subir a la columna: falta un dueño en el mapa (suele venir de correlativas dependsOn).",
  [EditErrorCode.NoSpineAnchor]:
    "No se pudo subir a la columna: no hay un lugar en la columna vertebral para insertarlo.",
  [EditErrorCode.SeparateNotOnSpine]: "Separar rama: el tema debe estar en la columna vertebral.",
  [EditErrorCode.SeparateNoNeighbors]:
    "Separar rama: el tramo debe tener un tema anterior y otro posterior en la columna.",
  [EditErrorCode.SeparateSameNode]: "Separar rama: elegí dos temas distintos.",
  [EditErrorCode.SeparateDifferentLists]:
    "Separar rama: los dos temas deben estar en la misma columna vertebral.",
  [EditErrorCode.ForkLaneNotFound]: "Separar rama: no se encontró la rama en el fork.",
  [EditErrorCode.MergeForkNotFound]: "Unir ramas: no hay un fork en ese punto del tronco.",
  [EditErrorCode.MergeForkPickLane]:
    "Unir ramas: con más de dos ramas, clic en un tema dentro de la rama que querés unir al tronco.",
  [EditErrorCode.SideBlockedMergeJoin]:
    "Lateral: no se puede mover el nodo de unión del fork sin un sucesor en la columna.",
  [EditErrorCode.SideBlockedForkAnchor]:
    "Lateral: no se puede mover el ancla donde se abre el fork; usá Unir ramas primero.",
  [EditErrorCode.ShiftNoNeighbor]: "Subir/Bajar: no hay otro tema adyacente en este orden.",
  [EditErrorCode.ShiftCrossForkBlocked]:
    "Subir/Bajar: no se puede reordenar entre forks de esta forma; usá Separar o Unir ramas.",
  [EditErrorCode.ConceptNotInSubgraph]: "El tema no forma parte de este mapa de conceptos.",
  [EditErrorCode.CodecInvalidCuration]:
    "El layout guardado no se pudo interpretar; revisá el mapa en la base de datos.",
};

export function editErrorMessage(error: EditError): string {
  return EDIT_ERROR_MESSAGES[error.code];
}
