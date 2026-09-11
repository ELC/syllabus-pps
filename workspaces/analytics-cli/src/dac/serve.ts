import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolveGeneratedDacDir } from "../generated";
import {
  DacCliNotFoundError,
  DacDirectoryNotFoundError,
  DacGitWorktreeRequiredError,
  DacServeFailedError,
} from "./errors";

export function serveDac(outDir: string): void {
  const dacDir = resolveGeneratedDacDir(outDir);
  if (!existsSync(dacDir)) {
    throw new DacDirectoryNotFoundError(dacDir);
  }

  const probe = spawnSync("dac", ["--help"], { stdio: "ignore" });
  if (probe.error) {
    throw new DacCliNotFoundError();
  }

  const gitProbe = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: dacDir,
    stdio: "ignore",
  });
  if (gitProbe.status !== 0) {
    throw new DacGitWorktreeRequiredError();
  }

  const result = spawnSync("dac", ["serve", "--dir", dacDir, "--open"], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new DacServeFailedError(result.status);
  }
}
