import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppAdminRow {
  email: string;
  display_name: string | null;
  created_at: string;
}

export async function fetchIsAppAdmin(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_app_admin");
  if (error) {
    console.warn("[pps] is_app_admin failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function listAppAdmins(client: SupabaseClient): Promise<AppAdminRow[]> {
  const { data, error } = await client
    .from("app_admins")
    .select("email, display_name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AppAdminRow[];
}

export async function addAppAdmin(
  client: SupabaseClient,
  email: string,
  displayName: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const name = displayName.trim();
  const { error } = await client.from("app_admins").insert({
    email: normalizedEmail,
    display_name: name || null,
  });
  if (error) {
    throw error;
  }
}

export async function removeAppAdmin(client: SupabaseClient, email: string): Promise<void> {
  const { error } = await client.from("app_admins").delete().eq("email", email.trim().toLowerCase());
  if (error) {
    throw error;
  }
}
