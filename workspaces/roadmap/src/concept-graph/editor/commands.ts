import { EditCommandKind, ShiftDirection } from "../kinds";

export type ShiftCommand = {
  readonly kind: typeof EditCommandKind.Shift;
  readonly title: string;
  readonly direction: ShiftDirection;
  readonly swapWith: string;
};

export type SeparateCommand = {
  readonly kind: typeof EditCommandKind.Separate;
  readonly firstTitle: string;
  readonly lastTitle: string;
};

export type MergeForkCommand = {
  readonly kind: typeof EditCommandKind.MergeFork;
  readonly conceptTitle: string;
};

export type PromoteToSpineCommand = {
  readonly kind: typeof EditCommandKind.PromoteToSpine;
  readonly branchTitle: string;
  readonly ownerTitle: string | undefined;
};

export type AttachLateralCommand = {
  readonly kind: typeof EditCommandKind.AttachLateral;
  readonly ownerTitle: string;
  readonly branchTitle: string;
};

export type ConceptEditCommand =
  | ShiftCommand
  | SeparateCommand
  | MergeForkCommand
  | PromoteToSpineCommand
  | AttachLateralCommand;
