import {
  analyticsRebuildIndicatorPhase,
  subscribeAnalyticsRebuildStatus,
  type AnalyticsRebuildIndicatorPhase,
} from "@pps/content/browser";

const LABELS: Record<AnalyticsRebuildIndicatorPhase, string> = {
  updated: "Actualizado",
  updating: "Actualizando...",
  unknown: "Estado desconocido",
};

function render(host: HTMLElement, phase: AnalyticsRebuildIndicatorPhase, extraClass?: string): void {
  host.className = ["pps-rebuild-indicator", `pps-rebuild-indicator--${phase}`, extraClass]
    .filter(Boolean)
    .join(" ");
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.replaceChildren();

  const dot = document.createElement("span");
  dot.className = "pps-rebuild-indicator__dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "pps-rebuild-indicator__label";
  label.textContent = LABELS[phase];

  host.append(dot, label);
}

/** Mount rebuild status UI for Astro/vanilla pages (Network, etc.). */
export function mountAnalyticsRebuildIndicator(
  host: HTMLElement,
  options: { className?: string } = {},
): () => void {
  const extraClass = options.className;

  return subscribeAnalyticsRebuildStatus((status) => {
    render(host, analyticsRebuildIndicatorPhase(status), extraClass);
  });
}
