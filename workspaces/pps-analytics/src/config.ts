import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createLoadedConfig,
  emptyLoadedConfig,
  ExpectedCurriculum,
  LoadedConfig,
} from "@pps/core";

export {
  createLoadedConfig,
  defaultAdministrativePages,
  emptyLoadedConfig,
  type LoadedConfig,
} from "@pps/core";

const configRequire = createRequire(__filename);

export function loadConfig(configPath?: string): LoadedConfig {
  if (!configPath || !existsSync(configPath)) {
    return emptyLoadedConfig();
  }

  const absolutePath = resolve(configPath);
  const imported = configRequire(absolutePath) as { default?: ExpectedCurriculum } | ExpectedCurriculum;
  const expected = ("default" in imported && imported.default ? imported.default : imported) as ExpectedCurriculum;

  return createLoadedConfig(expected, { path: absolutePath, contentDir: expected.contentDir });
}
