/** Smaller label typography so long materia titles wrap to ~2 lines in the course card. */
export function courseLabelDensityClass(label: string): string {
  const text = label.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (text.length > 42 || wordCount >= 7) {
    return "roadmap__course-label--compact";
  }

  if (text.length > 34 || wordCount >= 6) {
    return "roadmap__course-label--compact-md";
  }

  return "";
}

export function courseUsesDenseLabel(label: string): boolean {
  return courseLabelDensityClass(label).length > 0;
}
