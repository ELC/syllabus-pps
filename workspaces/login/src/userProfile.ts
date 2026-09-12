import type { User } from "@supabase/supabase-js";

export function readUserDisplayName(user: User | null | undefined): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "display_name"] as const) {
    const value = metadata[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}
