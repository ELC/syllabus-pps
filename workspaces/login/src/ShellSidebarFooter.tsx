interface ShellSidebarFooterProps {
  email?: string | null;
  userName?: string | null;
  onSignOut?: () => void | Promise<void>;
}

export function ShellSidebarFooter({ email, userName, onSignOut }: ShellSidebarFooterProps) {
  const active = Boolean(email && onSignOut);
  const resolvedName = userName?.trim() || null;

  return (
    <div className="dashboard-sidebar-footer">
      <div
        className={active ? "dashboard-sidebar-user dashboard-sidebar-user-active" : "dashboard-sidebar-user"}
        aria-live="polite"
      >
        <div className="dashboard-sidebar-user-name" data-pps-user-name hidden={!active || !resolvedName}>
          {active && resolvedName ? resolvedName : "\u00a0"}
        </div>
        <div className="dashboard-sidebar-user-email" data-pps-user-email>
          {active ? email : "\u00a0"}
        </div>
      </div>
      <div className="dashboard-sidebar-signout-slot">
        {active ? (
          <button
            type="button"
            className="login-sign-out login-sign-out-active"
            data-pps-sign-out
            onClick={() => void onSignOut!()}
          >
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const SHELL_SIDEBAR_FOOTER_HTML = `<div class="dashboard-sidebar-footer">
  <div class="dashboard-sidebar-user" aria-live="polite">
    <div class="dashboard-sidebar-user-name" data-pps-user-name hidden>&nbsp;</div>
    <div class="dashboard-sidebar-user-email" data-pps-user-email>&nbsp;</div>
  </div>
  <div class="dashboard-sidebar-signout-slot">
    <button type="button" class="login-sign-out" data-pps-sign-out hidden>Sign out</button>
  </div>
</div>`;
