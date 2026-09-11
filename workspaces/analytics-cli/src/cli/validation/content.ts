import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function assertContentDir(contentDir: string): void {
  const absolute = resolve(contentDir);
  if (!existsSync(absolute)) {
    throw new Error(`Expected content pages directory at ${absolute}.`);
  }
}
