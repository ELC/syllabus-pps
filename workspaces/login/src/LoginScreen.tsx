import type { ReactNode } from "react";

import { DEVELOPER_CREDIT_LABEL, DEVELOPER_LINKEDIN_URL } from "./sidebar-footer-html";
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
    <div className="login__screen">
      <div className="login__logo-wrap">
        <img
          className="login__logo"
          src={loginLogoHref()}
          alt="Universidad Austral"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          decoding="async"
        />
      </div>
      <div className="login__panel">
        {children}
        <div className="login__developer-credit">
          <a
            href={DEVELOPER_LINKEDIN_URL}
            className="login__developer-credit-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {DEVELOPER_CREDIT_LABEL}
          </a>
        </div>
      </div>
    </div>
  );
}
