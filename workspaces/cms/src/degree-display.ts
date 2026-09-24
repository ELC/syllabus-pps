/** Prefer long degree name; strip a duplicated short title prefix from fullName. */
export function preferDegreeDisplayName(title: string, fullName: string): string {
  const full = fullName.trim();
  const short = title.trim();
  if (!full) {
    return short;
  }
  if (!short || full === short) {
    return full;
  }

  const lowerFull = full.toLowerCase();
  const lowerShort = short.toLowerCase();
  const separators = [" · ", " - ", " — ", ": ", " "];
  for (const separator of separators) {
    const prefix = `${lowerShort}${separator}`;
    if (lowerFull.startsWith(prefix)) {
      const stripped = full.slice(prefix.length).trim();
      if (stripped) {
        return stripped;
      }
    }
  }

  return full;
}
