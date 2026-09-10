export class DacDirectoryNotFoundError extends Error {
  constructor(dacDir: string) {
    super(`DAC directory not found at ${dacDir}. Run the build command first.`);
    this.name = "DacDirectoryNotFoundError";
  }
}

export class DacCliNotFoundError extends Error {
  constructor() {
    super(
      "The `dac` CLI is not installed or is not on PATH. Install DAC first, then run this command again.",
    );
    this.name = "DacCliNotFoundError";
  }
}

export class DacGitWorktreeRequiredError extends Error {
  constructor() {
    super(
      "Bruin DAC executes queries from a Git project root. Run `git init` in the repository root, then run this command again.",
    );
    this.name = "DacGitWorktreeRequiredError";
  }
}

export class DacServeFailedError extends Error {
  constructor(exitCode: number | null) {
    super(`dac serve failed with exit code ${exitCode ?? "unknown"}.`);
    this.name = "DacServeFailedError";
  }
}
