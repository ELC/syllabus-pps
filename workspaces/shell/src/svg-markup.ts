export function prepareSvgMarkup(
  raw: string,
  options?: { className?: string; focusable?: boolean },
): string {
  let markup = raw.trim().replace(/<\?xml[^>]*>\s*/i, "");
  const classAttr = options?.className ? ` class="${options.className}"` : "";
  const focusableAttr = options?.focusable === false ? ' focusable="false"' : "";
  markup = markup.replace("<svg", `<svg${classAttr}${focusableAttr} aria-hidden="true"`);
  markup = markup.replace(/\s(width|height)="[^"]*"/gi, "");
  return markup;
}
