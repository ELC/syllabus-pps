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
    <div className="dashboard__footer">
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
    </div>
  );
}

export { SHELL_SIDEBAR_FOOTER_HTML } from "./sidebar-footer-html";
