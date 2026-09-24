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

/** Best-effort character index at a client point (for hit-testing `[@id]` citations). */
export function getTextareaOffsetFromClientPoint(
  textarea: HTMLTextAreaElement,
  clientX: number,
  clientY: number,
): number {
  const length = textarea.value.length;
  if (length === 0) {
    return 0;
  }

  const rect = textarea.getBoundingClientRect();
  const targetY = clientY - rect.top;
  const targetX = clientX - rect.left;

  let low = 0;
  let high = length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const { top } = getTextareaCaretOffset(textarea, mid);
    if (top < targetY) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const lineAnchor = Math.min(low, length);
  const anchorTop = getTextareaCaretOffset(textarea, lineAnchor).top;

  let lineStart = lineAnchor;
  while (lineStart > 0) {
    const previousTop = getTextareaCaretOffset(textarea, lineStart - 1).top;
    if (previousTop < anchorTop - 1) {
      break;
    }
    lineStart -= 1;
  }

  let best = lineStart;
  let bestDistance = Infinity;
  for (let index = lineStart; index <= length; index += 1) {
    const position = getTextareaCaretOffset(textarea, index);
    if (index > lineStart && position.top > anchorTop + 1) {
      break;
    }
    const distance = Math.hypot(position.left - targetX, position.top - targetY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }

  return best;
}
