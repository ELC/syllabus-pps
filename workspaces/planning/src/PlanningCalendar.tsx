import { useMemo, type CSSProperties } from "react";

import { PLANNING_WEEK_COUNT, type PlanningPlanDocument } from "@pps/content";

import {
  assignGlobalSpanLanes,
  buildProgramWeekGrid,
  conceptPrerequisiteSpansFromPlan,
  conceptTopicSpansFromPlan,
  ribbonStyleForConcept,
  ribbonRowClasses,
  ribbonsForCalendarRowAllRoles,
} from "./planning-calendar";

interface PlanningCalendarProps {
  plan: PlanningPlanDocument;
  labels: Map<string, string>;
  onConceptOpen?: (slug: string) => void;
}

export function PlanningCalendarHeader() {
  return (
    <header className="planning-calendar__header">
      <h2 className="planning-calendar__title">Programa · {PLANNING_WEEK_COUNT} semanas</h2>
      <p className="planning-calendar__subtitle">
        Cintas sólidas: <strong>Tema</strong>; rayadas: <strong>Sugerido</strong>. Tocá una cinta
        para ver recursos.
      </p>
    </header>
  );
}

export function PlanningCalendar({ plan, labels, onConceptOpen }: PlanningCalendarProps) {
  const topicSpans = useMemo(() => conceptTopicSpansFromPlan(plan), [plan]);
  const prerequisiteSpans = useMemo(() => conceptPrerequisiteSpansFromPlan(plan), [plan]);
  const grid = useMemo(() => buildProgramWeekGrid(), []);
  const laneBySpanKey = useMemo(
    () => assignGlobalSpanLanes(topicSpans, prerequisiteSpans),
    [prerequisiteSpans, topicSpans],
  );
  const rowLayouts = useMemo(
    () =>
      grid.map((row) => {
        const ribbons = ribbonsForCalendarRowAllRoles(
          row,
          topicSpans,
          prerequisiteSpans,
          laneBySpanKey,
        );
        const laneCount = ribbons.reduce((max, ribbon) => Math.max(max, ribbon.lane + 1), 0);
        return { row, ribbons, laneCount };
      }),
    [grid, laneBySpanKey, prerequisiteSpans, topicSpans],
  );

  return (
    <div className="planning-calendar">
      <PlanningCalendarHeader />

      <div className="planning-calendar__grid" role="grid" aria-label="Calendario del programa">
        {rowLayouts.map(({ row, ribbons, laneCount }, rowIndex) => (
          <div
            className="planning-calendar__block"
            key={rowIndex}
            style={
              {
                "--planning-calendar-lanes": Math.max(laneCount, 1),
              } as CSSProperties
            }
          >
            <div className="planning-calendar__cells">
              {row.map((week, columnIndex) => (
                <div
                  className={
                    week == null
                      ? "planning-calendar__cell planning-calendar__cell--empty"
                      : "planning-calendar__cell"
                  }
                  role="gridcell"
                  aria-label={week != null ? `Semana ${week}` : undefined}
                  key={columnIndex}
                >
                  {week != null ? (
                    <span className="planning-calendar__week-label">Semana {week}</span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="planning-calendar__ribbon-layer" aria-hidden={ribbons.length === 0}>
              {ribbons.map((ribbon) => {
                const title = labels.get(ribbon.slug) ?? ribbon.slug;
                const roleLabel = ribbon.role === "topic" ? "Tema" : "Sugerido";
                return (
                  <button
                    type="button"
                    className={ribbonRowClasses(ribbon).join(" ")}
                    key={`${ribbon.role}-${ribbon.slug}-${ribbon.lane}-${ribbon.colStart}-${rowIndex}`}
                    style={{
                      gridColumn: `${ribbon.colStart + 1} / ${ribbon.colEnd + 2}`,
                      gridRow: ribbon.lane + 1,
                      ...ribbonStyleForConcept(ribbon.slug, ribbon.role),
                    }}
                    title={`${roleLabel}: ${title}`}
                    aria-label={`${roleLabel}: ${title}. Ver recursos`}
                    onClick={() => onConceptOpen?.(ribbon.slug)}
                  >
                    {ribbon.showLabel ? (
                      <span className="planning-calendar__ribbon-label">{title}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
