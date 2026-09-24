import { afterEach, describe, expect, it } from "vitest";

import {
  isPlanningCalendarViewParam,
  PLANNING_CALENDAR_VIEW,
  readConceptParam,
  readCourseParam,
  readPlanningViewParam,
  writePlanningConceptParam,
  writePlanningUrlParams,
} from "../../../planning/src/course-param";

const BASE = "https://example.test/planning/";

function setLocation(path: string): void {
  window.history.replaceState({}, "", path);
}

describe("planning view URL param", () => {
  afterEach(() => {
    setLocation(BASE);
  });

  it("reads calendar view from view=calendar", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i&view=calendar`);
    expect(readPlanningViewParam()).toBe(PLANNING_CALENDAR_VIEW);
    expect(isPlanningCalendarViewParam()).toBe(true);
  });

  it("omits view param for the default table view", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i`);
    writePlanningUrlParams("programacion-i", "lds", "replace", null);
    expect(window.location.search).not.toContain("view=");
    expect(readPlanningViewParam()).toBeNull();
  });

  it("writes calendar view for shareable links", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i`);
    writePlanningUrlParams("programacion-i", "lds", "replace", PLANNING_CALENDAR_VIEW);
    expect(window.location.search).toContain("view=calendar");
  });

  it("preserves calendar view when course or degree changes", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i&view=calendar`);
    writePlanningUrlParams("algoritmos", "lds", "replace");
    expect(window.location.search).toContain("view=calendar");
    expect(window.location.search).toContain("course=algoritmos");
  });

  it("reads and writes concept slide-out param", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i&concept=algoritmos`);
    expect(readConceptParam()).toBe("algoritmos");
    writePlanningUrlParams("programacion-i", "lds", "replace", "preserve", null);
    expect(window.location.search).not.toContain("concept=");
    writePlanningUrlParams("programacion-i", "lds", "replace", "preserve", "sql");
    expect(readConceptParam()).toBe("sql");
  });

  it("preserves concept when toggling only view", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i&concept=algoritmos`);
    writePlanningUrlParams("programacion-i", "lds", "replace", PLANNING_CALENDAR_VIEW);
    expect(readConceptParam()).toBe("algoritmos");
    expect(window.location.search).toContain("view=calendar");
  });

  it("clears concept when course changes explicitly", () => {
    setLocation(`${BASE}?degree=lds&course=programacion-i&concept=algoritmos`);
    writePlanningUrlParams("algoritmos", "lds", "replace", "preserve", null);
    expect(readConceptParam()).toBeNull();
  });

  it("writePlanningConceptParam clears concept without dropping course, degree, or view", () => {
    setLocation(
      `${BASE}?degree=lds&course=bases-de-datos&view=calendar&concept=algebra-relacional`,
    );
    writePlanningConceptParam(null, "replace");
    expect(readConceptParam()).toBeNull();
    expect(readCourseParam()).toBe("bases-de-datos");
    expect(readPlanningViewParam()).toBe(PLANNING_CALENDAR_VIEW);
    expect(window.location.search).toContain("degree=lds");
  });
});
