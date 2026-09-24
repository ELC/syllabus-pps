export type ConceptEditTool = "select" | "side" | "spine";

export const CONCEPT_EDIT_TOOL_LABELS: Record<ConceptEditTool, string> = {
  select: "Seleccionar",
  side: "Lateral",
  spine: "A columna",
};

export type ConceptEditSidePhase = "idle" | "side-owner";

export function conceptEditHintForTool(
  tool: ConceptEditTool,
  sidePhase: ConceptEditSidePhase,
): string {
  switch (tool) {
    case "select":
      return "Seleccioná un tema y usá Subir o Bajar para cambiar el orden en la columna.";
    case "side":
      if (sidePhase === "side-owner") {
        return "Lateral: clic en el tema que debe quedar al costado.";
      }
      return "Lateral: primer clic en el dueño en la columna; segundo clic en el tema a mover.";
    case "spine":
      return "A columna: clic en un tema lateral para devolverlo a la columna vertebral.";
    default:
      return "";
  }
}
