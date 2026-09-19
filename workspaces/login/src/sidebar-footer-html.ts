import { signOutIconSvg } from "@pps/login/sidebar-icons";

export const SHELL_SIDEBAR_FOOTER_HTML = `<div class="dashboard__footer">
  <div class="dashboard__user" aria-live="polite">
    <div class="dashboard__user-name" data-pps-user-name hidden>&nbsp;</div>
    <div class="dashboard__user-email" data-pps-user-email>&nbsp;</div>
  </div>
  <div class="dashboard__signout-slot">
    <button type="button" class="dashboard__link login__sign-out" data-pps-sign-out title="Sign out" hidden>
      <span class="dashboard__link-icon">${signOutIconSvg()}</span>
      <span class="dashboard__link-label">Sign out</span>
    </button>
  </div>
</div>`;
