import type { ReactNode } from "react";

import { readBrowserSiteRoot } from "./siteRoot";

const LOGO_WIDTH = 5000;
const LOGO_HEIGHT = 1837;
const LOGO_PATH = "assets/shell/logo-horizontal-blanco.png";

function loginLogoHref(): string {
  const root = readBrowserSiteRoot();
  const normalized = root.endsWith("/") ? root : `${root}/`;
  return `${normalized}${LOGO_PATH}`;
}

export function LoginScreen({ children }: { children: ReactNode }) {
  return (
    <div className="login-screen">
      <div className="login-logo-wrap">
        <img
          className="login-logo"
          src={loginLogoHref()}
          alt="Universidad Austral"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          decoding="async"
        />
      </div>
      <div className="login-panel">{children}</div>
    </div>
  );
}
