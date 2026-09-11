import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@pps/roadmap/App";
import "@pps/roadmap/styles/roadmap.css";

export function mountRoadmapApp(containerId: string, dataUrl?: string): void {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing roadmap container #${containerId}`);
  }

  createRoot(container).render(
    <StrictMode>
      <App dataUrl={dataUrl} />
    </StrictMode>,
  );
}
