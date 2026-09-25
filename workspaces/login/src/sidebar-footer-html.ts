import { signOutIconSvg } from "@pps/login/sidebar-icons";

export const DEVELOPER_LINKEDIN_URL = "https://www.linkedin.com/in/ezequielcastano/";

export const DEVELOPER_CREDIT_LABEL = "Developed by ELC";
export const DEVELOPER_CREDIT_SHORT_LABEL = "By ELC";

export function developerCreditHtml(): string {
  return `<div class="dashboard__developer-credit">
  <a href="${DEVELOPER_LINKEDIN_URL}" class="dashboard__developer-credit-link" target="_blank" rel="noopener noreferrer" aria-label="${DEVELOPER_CREDIT_LABEL}" data-pps-developer-credit-short="${DEVELOPER_CREDIT_SHORT_LABEL}">
    <span class="dashboard__developer-credit-label dashboard__developer-credit-label--full">${DEVELOPER_CREDIT_LABEL}</span>
    <span class="dashboard__developer-credit-label dashboard__developer-credit-label--short">${DEVELOPER_CREDIT_SHORT_LABEL}</span>
  </a>
</div>`;
}

function renderSignOutButton(): string {
  return `<button type="button" class="dashboard__link login__sign-out" data-pps-sign-out title="Sign out">
      <span class="dashboard__link-icon">${signOutIconSvg()}</span>
      <span class="dashboard__link-label">Sign out</span>
    </button>`;
}

export const SHELL_SIDEBAR_FOOTER_HTML = `<div class="dashboard__footer dashboard__footer--menu">
  <div class="dashboard__user" aria-live="polite">
    <div class="dashboard__user-name" data-pps-user-name hidden>&nbsp;</div>
    <div class="dashboard__user-email" data-pps-user-email>&nbsp;</div>
  </div>
  <div class="dashboard__signout-slot">
    ${renderSignOutButton()}
  </div>
  ${developerCreditHtml()}
</div>`;

function upgradeDeveloperCreditLink(link: HTMLAnchorElement): void {
  if (link.querySelector(".dashboard__developer-credit-label--short")) {
    return;
  }

  link.setAttribute("aria-label", DEVELOPER_CREDIT_LABEL);
  link.dataset.ppsDeveloperCreditShort = DEVELOPER_CREDIT_SHORT_LABEL;
  link.innerHTML = `<span class="dashboard__developer-credit-label dashboard__developer-credit-label--full">${DEVELOPER_CREDIT_LABEL}</span><span class="dashboard__developer-credit-label dashboard__developer-credit-label--short">${DEVELOPER_CREDIT_SHORT_LABEL}</span>`;
}

export function ensureDeveloperCredit(root: ParentNode = document): void {
  for (const footer of root.querySelectorAll(".dashboard__footer--menu")) {
    if (!footer.querySelector(".dashboard__developer-credit")) {
      footer.insertAdjacentHTML("beforeend", developerCreditHtml());
      continue;
    }

    const link = footer.querySelector<HTMLAnchorElement>(".dashboard__developer-credit-link");
    if (link) {
      if (!link.dataset.ppsDeveloperCreditShort) {
        link.dataset.ppsDeveloperCreditShort = DEVELOPER_CREDIT_SHORT_LABEL;
      }
      upgradeDeveloperCreditLink(link);
    }
  }
}

/** Ensures prerendered shells from before the mobile menu refactor still get a sign-out control. */
export function repairShellSignOutMarkup(root: ParentNode = document): void {
  root.querySelectorAll(".dashboard__menu-sign-out").forEach((node) => {
    node.remove();
  });

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-pps-sign-out]")) {
    button.removeAttribute("hidden");
  }

  const panel = root.querySelector(".dashboard__sidebar-drawer-panel");
  if (panel && !panel.querySelector("[data-pps-sign-out]")) {
    const footer =
      panel.querySelector(".dashboard__footer") ??
      (() => {
        const created = document.createElement("div");
        created.className = "dashboard__footer dashboard__footer--menu";
        panel.appendChild(created);
        return created;
      })();

    if (!footer.querySelector(".dashboard__user")) {
      footer.insertAdjacentHTML(
        "afterbegin",
        `<div class="dashboard__user" aria-live="polite">
    <div class="dashboard__user-name" data-pps-user-name hidden>&nbsp;</div>
    <div class="dashboard__user-email" data-pps-user-email>&nbsp;</div>
  </div>`,
      );
    }

    footer.insertAdjacentHTML(
      "beforeend",
      `<div class="dashboard__signout-slot">${renderSignOutButton()}</div>`,
    );
  }

  ensureDeveloperCredit(root);
}
