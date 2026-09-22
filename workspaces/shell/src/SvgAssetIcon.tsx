import { useMemo, type ReactElement } from "react";

import { prepareSvgMarkup } from "./svg-markup";

export interface SvgAssetIconProps {
  /** SVG file contents (`import icon from "./icon.svg?raw"`). */
  svg: string;
  className?: string;
  hostClassName?: string;
  focusable?: boolean;
}

export function SvgAssetIcon({
  svg,
  className,
  hostClassName,
  focusable = false,
}: SvgAssetIconProps): ReactElement {
  const html = useMemo(
    () => prepareSvgMarkup(svg, { className, focusable }),
    [className, focusable, svg],
  );

  return (
    <span
      className={["svg-asset-icon", hostClassName].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
