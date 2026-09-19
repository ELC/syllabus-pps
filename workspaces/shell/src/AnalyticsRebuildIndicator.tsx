import {
  analyticsRebuildIndicatorPhase,
  type AnalyticsRebuildStatus,
} from "@pps/content/browser";
import type { ReactElement } from "react";

const LABELS = {
  updated: "Actualizado",
  updating: "Actualizando...",
  unknown: "Estado desconocido",
} as const;

export interface AnalyticsRebuildIndicatorProps {
  status: AnalyticsRebuildStatus | null;
  className?: string;
}

export function AnalyticsRebuildIndicator({
  status,
  className,
}: AnalyticsRebuildIndicatorProps): ReactElement {
  const phase = analyticsRebuildIndicatorPhase(status);
  const label = LABELS[phase];

  return (
    <span
      className={["pps-rebuild-indicator", `pps-rebuild-indicator--${phase}`, className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className="pps-rebuild-indicator__dot" aria-hidden="true" />
      <span className="pps-rebuild-indicator__label">{label}</span>
    </span>
  );
}
