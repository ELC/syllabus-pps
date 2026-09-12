export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export interface MissingSupabaseConfig {
  missing: true;
  message: string;
}

export type SupabaseConfigResult = SupabasePublicConfig | MissingSupabaseConfig;

export function readSupabaseConfig(): SupabaseConfigResult {
  const url = import.meta.env.PUBLIC_SUPABASE_PROJECT_URL?.trim();
  const anonKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !anonKey) {
    return {
      missing: true,
      message:
        "Missing PUBLIC_SUPABASE_PROJECT_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env at the repository root and set the publishable Supabase keys.",
    };
  }

  return { url, anonKey };
}

export function isMissingConfig(config: SupabaseConfigResult): config is MissingSupabaseConfig {
  return "missing" in config;
}
