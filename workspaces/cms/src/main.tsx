import "@pps/shell/shell-chrome";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { bootstrapAuthenticatedApp } from "@pps/login/bootstrap";
import { App } from "./App";
import "./styles/cms.css";

const host = document.getElementById("root");
if (!host) {
  throw new Error("CMS root element #root was not found.");
}

void bootstrapAuthenticatedApp(host, (root) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
