import type { ConceptEditTool } from "./concept-edit-tools";
import { CONCEPT_EDIT_TOOL_LABELS } from "./concept-edit-tools";

interface RoadmapConceptEditToolbarProps {
  activeTool: ConceptEditTool;
  onToolChange: (tool: ConceptEditTool) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const TOOLS: ConceptEditTool[] = [
  "select",
  "branch",
  "side",
  "mergeFork",
  "spine",
];

export function RoadmapConceptEditToolbar({
  activeTool,
  onToolChange,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: RoadmapConceptEditToolbarProps) {
  return (
    <div className="roadmap__concept-edit-tools" role="toolbar" aria-label="Herramientas de edición del mapa">
      <div className="roadmap__concept-edit-order">
        <button
          type="button"
          className="roadmap__concept-edit-tool"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          Subir
        </button>
        <button
          type="button"
          className="roadmap__concept-edit-tool"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          Bajar
        </button>
      </div>
      {TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          className={`roadmap__concept-edit-tool${activeTool === tool ? " roadmap__concept-edit-tool--active" : ""}`}
          aria-pressed={activeTool === tool}
          onClick={() => onToolChange(tool)}
        >
          {CONCEPT_EDIT_TOOL_LABELS[tool]}
        </button>
      ))}
    </div>
  );
}
