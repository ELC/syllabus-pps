export type ConceptEditTool =
  | "select"
  | "branch"
  | "side"
  | "mergeFork"
  | "spine";

export const CONCEPT_EDIT_TOOL_LABELS: Record<ConceptEditTool, string> = {
  select: "Seleccionar",
  branch: "Separar rama",
  side: "Lateral",
  mergeFork: "Unir ramas",
  spine: "A columna",
};

export type ConceptEditBranchPhase = "idle" | "range-first" | "side-owner";

export function conceptEditHintForTool(
  tool: ConceptEditTool,
  branchPhase: ConceptEditBranchPhase,
): string {
  switch (tool) {
    case "select":
      return "Seleccioná un tema y usá Subir o Bajar para cambiar el orden en su columna.";
    case "branch":
      if (branchPhase === "range-first") {
        return "Separar rama: clic en el segundo tema de la columna (el último seleccionado va a una rama; el resto del tramo a la otra).";
      }
      return "Separar rama: dos clics en la columna abren un fork (dos caminos en el tronco) que se unen de nuevo; el segundo clic va en un camino y el resto del tramo en el otro.";
    case "side":
      if (branchPhase === "side-owner") {
        return "Lateral: clic en el tema que debe quedar al costado.";
      }
      return "Lateral: primer clic en el dueño en la columna; segundo clic en el tema a mover.";
    case "mergeFork":
      return "Unir ramas: con dos caminos en total (incluido un tema solo en la columna), un clic colapsa; si hay tres o más, clic en una rama lateral para unirla con la rama vecina (Subir/Bajar reordenan después).";
    case "spine":
      return "A columna: clic en un tema lateral para devolverlo a la columna vertebral.";
    default:
      return "";
  }
}
