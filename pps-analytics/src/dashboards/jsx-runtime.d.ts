declare module "react/jsx-runtime" {
  export namespace JSX {
    type Element = unknown;
  }

  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function Fragment(props: { children?: unknown }): JSX.Element;
}
