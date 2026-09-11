import { analyticsFlags } from "./analytics";

export const serveDacFlags = {
  out: analyticsFlags.out,
};

export const serveDacParameters = {
  flags: serveDacFlags,
};

export interface ServeDacFlags {
  out: string;
}
