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
            className="login__sign-out login__sign-out--active"
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

export const SHELL_SIDEBAR_FOOTER_HTML = `<div class="dashboard__footer">
  <div class="dashboard__user" aria-live="polite">
    <div class="dashboard__user-name" data-pps-user-name hidden>&nbsp;</div>
    <div class="dashboard__user-email" data-pps-user-email>&nbsp;</div>
  </div>
  <div class="dashboard__signout-slot">
    <button type="button" class="login__sign-out" data-pps-sign-out hidden>Sign out</button>
  </div>
</div>`;
