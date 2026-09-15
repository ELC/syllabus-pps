import { ROADMAP_STATUS_CYCLE, ROADMAP_STATUS_LABELS } from "./progress";

type LegendMarker =
  | { kind: "swatch"; key: string }
  | { kind: "line"; key: string }
  | { kind: "status"; key: string };

interface LegendEntry {
  marker: LegendMarker;
  label: string;
}

const LEGEND_SECTIONS: LegendEntry[][] = [
  [
    { marker: { kind: "swatch", key: "spine" }, label: "Eje" },
    { marker: { kind: "swatch", key: "capstone" }, label: "Proyecto integrador" },
    { marker: { kind: "swatch", key: "done" }, label: "Completado" },
  ],
  [
    { marker: { kind: "line", key: "spine" }, label: "Secuencia del eje" },
    { marker: { kind: "line", key: "branch" }, label: "Derivado" },
  ],
  ROADMAP_STATUS_CYCLE.map((status) => ({
    marker: { kind: "status", key: status },
    label: ROADMAP_STATUS_LABELS[status],
  })),
];

function LegendMarkerIcon({ marker }: { marker: LegendMarker }) {
  switch (marker.kind) {
    case "swatch":
      return <span className={`roadmap__legend-swatch roadmap__legend-swatch--${marker.key}`} />;
    case "line":
      return <span className={`roadmap__legend-line roadmap__legend-line--${marker.key}`} />;
    case "status":
      return (
        <span className={`roadmap__legend-check roadmap__legend-check--${marker.key}`}>
          <span className="roadmap__legend-check-glyph" aria-hidden="true">
            {marker.key === "done" ? "✓" : marker.key === "skipped" ? "✕" : ""}
          </span>
        </span>
      );
  }
}

export function RoadmapLegend() {
  return (
    <details className="roadmap__legend">
      <summary className="roadmap__legend-summary">Referencias</summary>

      <div className="roadmap__legend-body">
        {LEGEND_SECTIONS.map((section, index) => (
          <ul key={index} className="roadmap__legend-group">
            {section.map((entry) => (
              <li key={`${entry.marker.kind}-${entry.marker.key}`} className="roadmap__legend-item">
                <LegendMarkerIcon marker={entry.marker} />
                {entry.label}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </details>
  );
}
