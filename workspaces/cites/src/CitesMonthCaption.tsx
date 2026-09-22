import { useMemo, type ReactElement } from "react";
import { useDayPicker, type MonthCaptionProps } from "react-day-picker";

import { MetaDropdown } from "@pps/shell/MetaDropdown";

export const CITES_DATE_YEAR_FROM = 1900;

export function citesDateYearTo(): number {
  return new Date().getFullYear() + 8;
}

function monthOptions(viewYear: number): Array<{ value: string; label: string }> {
  return Array.from({ length: 12 }, (_, index) => {
    const label = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
      new Date(viewYear, index, 1),
    );
    return {
      value: String(index),
      label: label.charAt(0).toUpperCase() + label.slice(1),
    };
  });
}

function yearOptions(): Array<{ value: string; label: string }> {
  const to = citesDateYearTo();
  const years: Array<{ value: string; label: string }> = [];
  for (let year = to; year >= CITES_DATE_YEAR_FROM; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return years;
}

export function CitesMonthCaption({
  calendarMonth,
  className,
  ...rest
}: MonthCaptionProps): ReactElement {
  const { goToMonth } = useDayPicker();
  const date = calendarMonth.date;
  const monthValue = String(date.getMonth());
  const yearValue = String(date.getFullYear());

  const months = useMemo(() => monthOptions(date.getFullYear()), [date]);
  const years = useMemo(() => yearOptions(), []);

  return (
    <div className={`cites-date-picker__caption${className ? ` ${className}` : ""}`} {...rest}>
      <MetaDropdown
        className="cites-date-picker__caption-month"
        value={monthValue}
        options={months}
        ariaLabel="Mes"
        onChange={(nextMonth) => {
          goToMonth(new Date(date.getFullYear(), Number(nextMonth), 1));
        }}
      />
      <MetaDropdown
        className="cites-date-picker__caption-year"
        value={yearValue}
        options={years}
        ariaLabel="Año"
        maxVisibleRows={10}
        onChange={(nextYear) => {
          goToMonth(new Date(Number(nextYear), date.getMonth(), 1));
        }}
      />
    </div>
  );
}
