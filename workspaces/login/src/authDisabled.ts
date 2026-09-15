import type { SidebarUserProfile } from "./shell-dom";

const DEV_AUTH_PROFILE: SidebarUserProfile = {
  email: "dev@local",
  userName: "Dev User",
};

/** Skip Supabase auth in local dev when PUBLIC_AUTH_DISABLED=true. Never active in production builds. */
export function isAuthDisabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  const flag = import.meta.env.PUBLIC_AUTH_DISABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export function readDevAuthProfile(): SidebarUserProfile {
  return DEV_AUTH_PROFILE;
}
