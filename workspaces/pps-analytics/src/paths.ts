import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadConfig } from "./config";

export const PACKAGE_NAME = "@pps/analytics-cli";

export function resolvePackageRoot(): string {
  let dir = __dirname;

  while (dir !== dirname(dir)) {
    const packageJsonPath = join(dir, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: string };
      if (packageJson.name === PACKAGE_NAME) {
        return dir;
      }
    }

    dir = dirname(dir);
  }

  throw new Error(`Could not resolve ${PACKAGE_NAME} package root.`);
}

export function resolveRepoRoot(): string {
  let dir = resolvePackageRoot();

  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml")) || existsSync(join(dir, "content", "pages"))) {
      return dir;
    }
    dir = dirname(dir);
  }

  throw new Error("Could not resolve repository root.");
}

export function resolveDefaultOutDir(): string {
  return resolvePackageRoot();
}

export function resolveDefaultConfigPath(): string | undefined {
  const root = resolvePackageRoot();
  const compiledConfigPath = join(root, "dist", "pps.config.js");
  if (existsSync(compiledConfigPath)) {
    return compiledConfigPath;
  }

  const sourceConfigPath = join(root, "pps.config.ts");
  return existsSync(sourceConfigPath) ? sourceConfigPath : undefined;
}

export function resolveAnalyticsConfig(configPath?: string): string | undefined {
  return configPath ?? resolveDefaultConfigPath();
}

export function resolveDefaultContentDir(): string {
  return join(resolveRepoRoot(), "content", "pages");
}

export function resolveContentDir(input?: { configPath?: string; cliContentDir?: string }): string {
  if (input?.cliContentDir) {
    return resolve(input.cliContentDir);
  }

  const config = loadConfig(input?.configPath ?? resolveDefaultConfigPath());
  if (config.contentDir) {
    return resolve(config.contentDir.startsWith(".") ? join(resolvePackageRoot(), config.contentDir) : config.contentDir);
  }

  const envContentDir = process.env.PPS_CONTENT_DIR;
  if (envContentDir) {
    return resolve(envContentDir);
  }

  return resolveDefaultContentDir();
}

export function resolveRootReadme(): string {
  return join(resolveRepoRoot(), "README.md");
}

export const ROOT_README = "../../README.md";
export const ROOT_README_DAC = `${ROOT_README}#dac-dashboard`;
