import { existsSync } from "node:fs";
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

function supabaseEnvDefines(
  projectUrl: string | undefined,
  publishableKey: string | undefined,
): Record<string, string> | undefined {
  const define: Record<string, string> = {};

  if (projectUrl) {
    define["import.meta.env.PUBLIC_SUPABASE_PROJECT_URL"] = JSON.stringify(projectUrl);
  }

  if (publishableKey) {
    define["import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(publishableKey);
  }

  return Object.keys(define).length > 0 ? define : undefined;
}

export function supabasePublicEnvPlugin(repoRoot: string): Plugin {
  return {
    name: "pps-supabase-public-env",
    config(_config: UserConfig, { command, mode }: ConfigEnv) {
      const { projectUrl, publishableKey } = readSupabasePublicEnv(repoRoot, mode);

      if (command === "build" && (!projectUrl || !publishableKey)) {
        throw new Error(
          "Missing PUBLIC_SUPABASE_PROJECT_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n" +
            "Set both in a root .env file for local builds, or as GitHub Actions secrets for deploy builds.",
        );
      }

      const define = supabaseEnvDefines(projectUrl, publishableKey);
      return define ? { define } : undefined;
    },
  };
}

function hasLocalReact(workspaceDir: string): boolean {
  const reactDir = resolve(workspaceDir, "node_modules/react");
  const reactDomDir = resolve(workspaceDir, "node_modules/react-dom");
  return existsSync(reactDir) && existsSync(reactDomDir);
}

function reactResolveAliases(workspaceDir: string): Record<string, string> {
  if (!hasLocalReact(workspaceDir)) {
    return {};
  }

  const reactDir = resolve(workspaceDir, "node_modules/react");
  const reactDomDir = resolve(workspaceDir, "node_modules/react-dom");

  return {
    react: reactDir,
    "react-dom": reactDomDir,
    "react-dom/client": resolve(reactDomDir, "client.js"),
    "react/jsx-runtime": resolve(reactDir, "jsx-runtime.js"),
    "react/jsx-dev-runtime": resolve(reactDir, "jsx-dev-runtime.js"),
  };
}

/** Shared Vite env for a workspace package directory (the folder with its package.json). */
export function sharedViteEnv(workspaceDir: string) {
  const repoRoot = repoRootFromWorkspace(workspaceDir);
  const reactAliases = reactResolveAliases(workspaceDir);
  const useLocalReact = hasLocalReact(workspaceDir);

  return {
    envDir: repoRoot,
    envPrefix: ["PUBLIC_", "VITE_"],
    resolve: {
      conditions: ["development", "import", "module", "browser", "default"],
      ...(useLocalReact
        ? {
            dedupe: ["react", "react-dom"],
            alias: reactAliases,
          }
        : {}),
    },
    ...(useLocalReact
      ? {
          optimizeDeps: {
            include: ["react", "react-dom", "react/jsx-dev-runtime"],
          },
        }
      : {}),
  };
}

export function withSharedVitePlugins(repoRoot: string, plugins: Plugin[] = []): Plugin[] {
  return [supabasePublicEnvPlugin(repoRoot), ...plugins];
}
