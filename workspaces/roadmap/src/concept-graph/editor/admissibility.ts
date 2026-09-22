import { Admissibility } from "../kinds";
import type { EditError } from "../errors";
import type {
  AttachLateralCommand,
  ConceptEditCommand,
  MergeForkCommand,
  PromoteToSpineCommand,
  SeparateCommand,
  ShiftCommand,
} from "./commands";

export type AllowedCommand<C extends ConceptEditCommand = ConceptEditCommand> = {
  readonly admissibility: typeof Admissibility.Allowed;
  readonly command: C;
};

export type BlockedCommand = {
  readonly admissibility: typeof Admissibility.Blocked;
  readonly error: EditError;
};

export type CommandAdmissibility<C extends ConceptEditCommand = ConceptEditCommand> =
  | AllowedCommand<C>
  | BlockedCommand;

export type ShiftAdmissibility = CommandAdmissibility<ShiftCommand>;
export type SeparateAdmissibility = CommandAdmissibility<SeparateCommand>;
export type MergeForkAdmissibility = CommandAdmissibility<MergeForkCommand>;
export type PromoteAdmissibility = CommandAdmissibility<PromoteToSpineCommand>;
export type AttachLateralAdmissibility = CommandAdmissibility<AttachLateralCommand>;

export function allowed<C extends ConceptEditCommand>(command: C): AllowedCommand<C> {
  return { admissibility: Admissibility.Allowed, command };
}

export function blocked(error: EditError): BlockedCommand {
  return { admissibility: Admissibility.Blocked, error };
}
