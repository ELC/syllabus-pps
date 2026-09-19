import type { CourseTrayecto, PageKind } from "./types";
import {
  COURSE_TRAYECTO_NO_ESTRUCTURADO,
  courseTrayectoAliases,
  courseTrayectos,
  DEFAULT_COURSE_TRAYECTO,
} from "./types";

export function isCourseTrayecto(value: string): value is CourseTrayecto {
  return (courseTrayectos as readonly string[]).includes(value);
}

export function isTrayectoNoEstructurado(trayecto: unknown): boolean {
  if (typeof trayecto !== "string") {
    return false;
  }

  return (
    trayecto === COURSE_TRAYECTO_NO_ESTRUCTURADO ||
    parseCourseTrayectoValue(trayecto) === COURSE_TRAYECTO_NO_ESTRUCTURADO
  );
}

export function parseCourseTrayectoValue(value: string): CourseTrayecto | undefined {
  const normalized = value.trim();
  if (isCourseTrayecto(normalized)) {
    return normalized;
  }

  return courseTrayectoAliases[normalized];
}

export function resolveCourseTrayecto(
  kind: PageKind,
  trayecto?: CourseTrayecto,
  trayectoInvalid?: boolean,
): CourseTrayecto {
  if (kind !== "course" || trayectoInvalid) {
    return DEFAULT_COURSE_TRAYECTO;
  }

  return trayecto ?? DEFAULT_COURSE_TRAYECTO;
}
