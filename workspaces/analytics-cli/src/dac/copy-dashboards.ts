import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolvePackageRoot } from "../paths";
import { writeGeneratedDashboardFile } from "./write-dashboard";

const DASHBOARD_SUFFIX = ".dashboard.tsx";

export function copyDashboardSources(dashboardsDir: string, generatedAt: string): void {
  const sourceDir = join(resolvePackageRoot(), "src/dashboards");
  mkdirSync(dashboardsDir, { recursive: true });

  for (const fileName of readdirSync(sourceDir).filter((name) => name.endsWith(DASHBOARD_SUFFIX))) {
    writeGeneratedDashboardFile(
      dashboardsDir,
      fileName,
      generatedAt,
      prepareDashboardSource(readFileSync(join(sourceDir, fileName), "utf8")),
    );
  }
}

function prepareDashboardSource(source: string): string {
  return source.replace(/^import ["']\.\/dac["'];\r?\n/, "");
}
