#!/usr/bin/env node
import { run, type StricliProcess } from "@stricli/core";
import { app } from "../app";
import type { CliContext } from "../context";

function createContext(processObject: StricliProcess): CliContext {
  return { process: processObject };
}

export async function main(
  argv: readonly string[],
  processObject: StricliProcess = process,
): Promise<number> {
  await run(app, argv, createContext(processObject));
  return Number(processObject.exitCode ?? 0);
}

if (require.main === module) {
  main(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
