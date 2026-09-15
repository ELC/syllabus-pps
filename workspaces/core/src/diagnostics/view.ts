import { match } from "ts-pattern";

import { DiagnosticSeverity } from "../types";

export const styledDiagnosticSeverities = [
  "error",
  "warning",
] as const satisfies readonly DiagnosticSeverity[];

export type StyledDiagnosticSeverity = (typeof styledDiagnosticSeverities)[number];

export function isStyledDiagnosticSeverity(value: string): value is StyledDiagnosticSeverity {
  return (styledDiagnosticSeverities as readonly string[]).includes(value);
}

export function createSeverityClassNameResolver(baseClass: string): (severity: string) => string {
  return (severity) =>
    match(severity)
      .when(isStyledDiagnosticSeverity, (value) => `${baseClass}--${value}`)
      .otherwise(() => "");
}
