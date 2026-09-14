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
      return <span className={`roadmap-legend-swatch roadmap-legend-swatch--${marker.key}`} />;
    case "line":
      return <span className={`roadmap-legend-line roadmap-legend-line--${marker.key}`} />;
    case "status":
      return (
        <span className={`roadmap-legend-check roadmap-legend-check--${marker.key}`}>
          <span className="roadmap-legend-check-glyph" aria-hidden="true" />
        </span>
      );
  }
}

export function RoadmapLegend() {
  return (
    <details className="roadmap-legend">
      <summary className="roadmap-legend-summary">Referencias</summary>

      <div className="roadmap-legend-body">
        {LEGEND_SECTIONS.map((section, index) => (
          <ul key={index} className="roadmap-legend-group">
            {section.map((entry) => (
              <li key={`${entry.marker.kind}-${entry.marker.key}`} className="roadmap-legend-item">
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
