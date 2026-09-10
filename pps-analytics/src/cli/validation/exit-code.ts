export function hasErrors(diagnostics: Array<{ severity: string }>): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
