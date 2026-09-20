/** Smaller label typography so long materia titles wrap to ~2 lines in the course card. */
export function courseLabelDensityClass(label: string): string {
  const text = label.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (text.length > 28 || wordCount >= 5) {
    return "roadmap__course-label--compact";
  }

  if (text.length > 20 || wordCount >= 4) {
    return "roadmap__course-label--compact-md";
  }

  return "";
}

export function courseUsesDenseLabel(label: string): boolean {
  return courseLabelDensityClass(label).length > 0;
}
