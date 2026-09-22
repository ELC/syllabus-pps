import "@pps/shell/shell-chrome";

import { StrictMode } from "react";

import { bootstrapAuthenticatedApp } from "@pps/login/bootstrap";
import { App } from "./App";
import "./styles/cites.scss";

const host = document.getElementById("root");
if (!host) {
  throw new Error("Cites root element #root was not found.");
}

void bootstrapAuthenticatedApp(host, (root) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
