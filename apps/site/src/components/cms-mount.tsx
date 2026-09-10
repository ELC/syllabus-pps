import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@pps/cms/App";
import "@pps/cms/styles/cms.css";

export function mountCmsApp(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing CMS container #${containerId}`);
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
