import {
  DEVELOPER_CREDIT_LABEL,
  DEVELOPER_CREDIT_SHORT_LABEL,
  DEVELOPER_LINKEDIN_URL,
} from "./sidebar-footer-html";
import { signOutIconSvg } from "./sidebar-icons";

interface ShellSidebarFooterProps {
  email?: string | null;
  userName?: string | null;
  onSignOut?: () => void | Promise<void>;
}

export function ShellSidebarFooter({ email, userName, onSignOut }: ShellSidebarFooterProps) {
  const active = Boolean(email && onSignOut);
  const resolvedName = userName?.trim() || null;

  return (
    <div className="dashboard__footer dashboard__footer--menu">
      <div
        className={active ? "dashboard__user dashboard__user--active" : "dashboard__user"}
        aria-live="polite"
      >
        <div className="dashboard__user-name" data-pps-user-name hidden={!active || !resolvedName}>
          {active && resolvedName ? resolvedName : "\u00a0"}
        </div>
        <div className="dashboard__user-email" data-pps-user-email>
          {active ? email : "\u00a0"}
        </div>
      </div>
      <div className="dashboard__signout-slot">
        {active ? (
          <button
            type="button"
            className="dashboard__link login__sign-out login__sign-out--active"
            data-pps-sign-out
            title="Sign out"
            onClick={() => void onSignOut!()}
          >
            <span
              className="dashboard__link-icon"
              dangerouslySetInnerHTML={{ __html: signOutIconSvg() }}
            />
            <span className="dashboard__link-label">Sign out</span>
          </button>
        ) : null}
      </div>
      <div className="dashboard__developer-credit">
        <a
          href={DEVELOPER_LINKEDIN_URL}
          className="dashboard__developer-credit-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={DEVELOPER_CREDIT_LABEL}
          data-pps-developer-credit-short={DEVELOPER_CREDIT_SHORT_LABEL}
        >
          <span className="dashboard__developer-credit-label dashboard__developer-credit-label--full">
            {DEVELOPER_CREDIT_LABEL}
          </span>
          <span className="dashboard__developer-credit-label dashboard__developer-credit-label--short">
            {DEVELOPER_CREDIT_SHORT_LABEL}
          </span>
        </a>
      </div>
    </div>
  );
}

export { SHELL_SIDEBAR_FOOTER_HTML } from "./sidebar-footer-html";
