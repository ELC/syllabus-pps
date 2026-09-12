import "@pps/shell/shell-chrome";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { bootstrapAuthenticatedApp } from "@pps/login/bootstrap";
import { App } from "./App";
import "./styles/roadmap.css";

const host = document.getElementById("root");
if (!host) {
  throw new Error("Roadmap root element #root was not found.");
}

void bootstrapAuthenticatedApp(host, (root) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
