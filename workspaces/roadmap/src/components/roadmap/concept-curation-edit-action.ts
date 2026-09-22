export type ConceptCurationEditAction =
  | { readonly kind: "load" }
  | { readonly kind: "undo" }
  | { readonly kind: "redo" }
  | { readonly kind: "shift"; readonly title: string; readonly direction: -1 | 1 }
  | {
      readonly kind: "separate";
      readonly firstSelectedTitle: string;
      readonly lastSelectedTitle: string;
    }
  | {
      readonly kind: "attachSide";
      readonly ownerTitle: string;
      readonly branchTitle: string;
    }
  | { readonly kind: "mergeFork"; readonly conceptTitle: string }
  | { readonly kind: "promoteToSpine"; readonly branchTitle: string };
