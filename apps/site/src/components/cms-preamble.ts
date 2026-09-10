import RefreshRuntime from "/@react-refresh";

declare global {
  interface Window {
    $RefreshReg$: () => void;
    $RefreshSig$: () => (type: unknown) => unknown;
  }
}

RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type: unknown) => type;
