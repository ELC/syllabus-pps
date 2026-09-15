import { capitalizeWords } from "./labels";

export interface CapstoneProject {
  id: string;
  title: string;
  description: string;
}

export interface CapstonePanelCloseOptions {
  updateUrl?: boolean;
}

export interface CapstonePanel {
  open: (capstone: CapstoneProject) => void;
  close: (options?: CapstonePanelCloseOptions) => void;
}

export interface CapstonePanelHandlers {
  onClose?: () => void;
}

export function mountCapstonePanel(
  root: HTMLElement,
  handlers?: CapstonePanelHandlers,
): CapstonePanel {
  const title = root.querySelector<HTMLElement>(".graph__capstone-title");
  const body = root.querySelector<HTMLElement>(".graph__capstone-body");
  const closeButton = root.querySelector<HTMLButtonElement>(".graph__capstone-close");
  const backdrop = root.querySelector<HTMLElement>(".graph__capstone-backdrop");
  const sheet = root.querySelector<HTMLElement>(".graph__capstone-sheet");

  if (!title || !body || !closeButton || !backdrop || !sheet) {
    throw new Error("Capstone panel markup is incomplete");
  }

  const setPanelOpen = (open: boolean) => {
    root.classList.toggle("graph__capstone-panel--open", open);
    backdrop.classList.toggle("graph__capstone-backdrop--open", open);
    sheet.classList.toggle("graph__capstone-sheet--open", open);
    root.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const close = (options?: CapstonePanelCloseOptions) => {
    setPanelOpen(false);
    if (options?.updateUrl !== false) {
      handlers?.onClose?.();
    }
  };

  const open = (capstone: CapstoneProject) => {
    title.textContent = capitalizeWords(capstone.title);
    body.textContent = capstone.description;
    setPanelOpen(true);
  };

  closeButton.addEventListener("click", () => close());
  backdrop.addEventListener("click", () => close());

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("graph__capstone-panel--open")) {
      close();
    }
  });

  return { open, close };
}
