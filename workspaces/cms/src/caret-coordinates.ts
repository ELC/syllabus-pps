/** Pixel offset of a text index inside a textarea, relative to the textarea padding box. */
export function getTextareaCaretOffset(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number } {
  const mirror = document.createElement("div");
  const computed = window.getComputedStyle(textarea);

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.font = computed.font;
  mirror.style.letterSpacing = computed.letterSpacing;
  mirror.style.tabSize = computed.tabSize;
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.style.boxSizing = computed.boxSizing;
  mirror.style.textTransform = computed.textTransform;
  mirror.style.textIndent = computed.textIndent;

  const before = textarea.value.slice(0, position);
  mirror.append(document.createTextNode(before));
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(position) || "\u200b";
  mirror.append(marker);

  document.body.append(mirror);
  const left = marker.offsetLeft;
  const top = marker.offsetTop;
  mirror.remove();

  const fontSize = Number.parseFloat(computed.fontSize) || 14;

  return {
    top: top - textarea.scrollTop,
    left: left - textarea.scrollLeft + fontSize * 0.45,
  };
}
