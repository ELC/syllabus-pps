import { useLayoutEffect, type RefObject } from "react";

const TARGET_LINES = 2;
const LINE_HEIGHT = 1.25;

interface TwoLineLabelOptions {
  maxRem: number;
  minRem: number;
  text: string;
}

function countLines(label: HTMLElement, fontRem: number): number {
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const linePx = fontRem * rootPx * LINE_HEIGHT;
  if (linePx <= 0) {
    return TARGET_LINES + 1;
  }

  return Math.ceil(label.scrollHeight / linePx);
}

function fitFontSize(label: HTMLElement, maxRem: number, minRem: number): void {
  let low = minRem;
  let high = maxRem;
  let best = minRem;

  for (let step = 0; step < 14; step += 1) {
    const mid = (low + high) / 2;
    label.style.fontSize = `${mid}rem`;
    const lines = countLines(label, mid);

    if (lines <= TARGET_LINES) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  label.style.fontSize = `${best}rem`;
}

export function useTwoLineLabelFontSize(
  labelRef: RefObject<HTMLElement | null>,
  { maxRem, minRem, text }: TwoLineLabelOptions,
): void {
  useLayoutEffect(() => {
    const label = labelRef.current;
    if (label === null) {
      return;
    }

    const run = () => {
      fitFontSize(label, maxRem, minRem);
    };

    run();

    const observer = new ResizeObserver(run);
    observer.observe(label);

    return () => {
      observer.disconnect();
    };
  }, [labelRef, maxRem, minRem, text]);
}
