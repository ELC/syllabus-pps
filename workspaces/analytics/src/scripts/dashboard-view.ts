import {
  createSeverityClassNameResolver,
  formatStaticMetricValue,
  rowMatchesStaticFilters,
  staticTableColumns,
} from "@pps/core";
import { match } from "ts-pattern";

export const severityClass = createSeverityClassNameResolver("analytics__table-severity");

export const formatMetricValue = formatStaticMetricValue;

export const rowMatchesFilters = rowMatchesStaticFilters;

export function tableCellClass(columnName: string, rowValue: string): string {
  return match(columnName)
    .with(staticTableColumns.severity, () =>
      `analytics__table-cell ${severityClass(rowValue)}`.trim(),
    )
    .otherwise(() => "analytics__table-cell");
}
