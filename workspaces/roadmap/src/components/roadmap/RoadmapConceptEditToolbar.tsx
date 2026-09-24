import type { ConceptEditTool } from "./concept-edit-tools";
import { CONCEPT_EDIT_TOOL_LABELS } from "./concept-edit-tools";

interface RoadmapConceptEditToolbarProps {
  activeTool: ConceptEditTool;
  onToolChange: (tool: ConceptEditTool) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopyDebugJson?: () => void;
}

const TOOLS: ConceptEditTool[] = ["select", "side", "spine"];

export function RoadmapConceptEditToolbar({
  activeTool,
  onToolChange,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopyDebugJson,
}: RoadmapConceptEditToolbarProps) {
  return (
    <div className="roadmap__concept-edit-tools" role="toolbar" aria-label="Herramientas de edición del mapa">
      <div className="roadmap__concept-edit-order">
        <button
          type="button"
          className="roadmap__concept-edit-tool"
          disabled={!canUndo}
          onClick={onUndo}
          title="Deshacer (⌘Z)"
        >
          Deshacer
        </button>
        <button
          type="button"
          className="roadmap__concept-edit-tool"
          disabled={!canRedo}
          onClick={onRedo}
          title="Rehacer (⇧⌘Z)"
        >
          Rehacer
        </button>
      </div>
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
      {onCopyDebugJson ? (
        <button
          type="button"
          className="roadmap__concept-edit-tool roadmap__concept-edit-tool--debug"
          onClick={onCopyDebugJson}
          title="Copia el estado del mapa (JSON) al portapapeles — solo desarrollo"
        >
          Copiar JSON
        </button>
      ) : null}
    </div>
  );
}
