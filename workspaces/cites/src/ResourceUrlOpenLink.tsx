import type { ReactElement } from "react";

import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import openSvg from "@pps/shell/assets/icons/resource-open.svg?raw";

import { isValidHttpUrl } from "./form-utils";

export interface ResourceUrlOpenLinkProps {
  url: string;
  title: string;
}

export function ResourceUrlOpenLink({ url, title }: ResourceUrlOpenLinkProps): ReactElement {
  const trimmed = url.trim();
  const canOpen = isValidHttpUrl(trimmed);
  const label = title.trim() ? `Abrir recurso: ${title.trim()}` : "Abrir recurso";

  const icon = (
    <SvgAssetIcon
      svg={openSvg}
      className="cites__url-open-icon"
      hostClassName="cites__url-open-icon-host"
      focusable={false}
    />
  );

  if (!canOpen) {
    return (
      <span className="cites__url-open cites__url-open--disabled" aria-hidden="true">
        {icon}
      </span>
    );
  }

  return (
    <a
      className="cites__url-open"
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={title.trim() || trimmed}
    >
      {icon}
    </a>
  );
}
