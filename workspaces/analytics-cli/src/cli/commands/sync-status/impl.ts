import { assertSupabaseServerEnv } from "@pps/content";
import { syncStatus } from "../../../sync";
import type { CliContext } from "../../context";

export default async function syncStatusCommand(this: CliContext): Promise<void> {
  assertSupabaseServerEnv();
  const status = await syncStatus();
  this.process.stdout.write(
    `Remote pages: ${status.pageCount}\nRemote resources: ${status.resourceCount}\n`,
  );
}
