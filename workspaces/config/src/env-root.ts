import { resolve } from "node:path";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import { loadEnv } from "vite";

export function repoRootFromWorkspace(workspaceDir: string): string {
  return resolve(workspaceDir, "../..");
}

function readSupabasePublicEnv(envDir: string, mode: string) {
  const env = loadEnv(mode, envDir, "");
  return {
    projectUrl: env.PUBLIC_SUPABASE_PROJECT_URL?.trim(),
    publishableKey: env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  };
}

export function supabasePublicEnvPlugin(repoRoot: string): Plugin {
  return {
    name: "pps-supabase-public-env",
    config(_config: UserConfig, { command, mode }: ConfigEnv) {
      if (command !== "build") {
        return;
      }

      const { projectUrl, publishableKey } = readSupabasePublicEnv(repoRoot, mode);
      if (projectUrl && publishableKey) {
        return;
      }

      throw new Error(
        "Missing PUBLIC_SUPABASE_PROJECT_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n" +
          "Set both in a root .env file for local builds, or as GitHub Actions secrets for deploy builds.",
      );
    },
  };
}

export function sharedViteEnv(repoRoot: string) {
  return {
    envDir: repoRoot,
    envPrefix: ["PUBLIC_", "VITE_"],
    resolve: {
      conditions: ["development", "import", "module", "browser", "default"],
    },
  };
}

export function withSharedVitePlugins(repoRoot: string, plugins: Plugin[] = []): Plugin[] {
  return [supabasePublicEnvPlugin(repoRoot), ...plugins];
}
