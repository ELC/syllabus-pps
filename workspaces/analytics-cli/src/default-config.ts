import { createLoadedConfig, type LoadedConfig } from "@pps/core";

import { expectedCurriculum } from "./expected-curriculum";

export function getDefaultLoadedConfig(): LoadedConfig {
  return createLoadedConfig(expectedCurriculum, {
    path: "embedded:expected-curriculum",
    contentDir: expectedCurriculum.contentDir,
  });
}
