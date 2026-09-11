import { serveDac } from "../../../dac";
import type { CliContext } from "../../context";
import type { ServeDacFlags } from "../../parameters/serve-dac";

export default function serveDacCommand(this: CliContext, flags: ServeDacFlags): void {
  serveDac(flags.out);
}
