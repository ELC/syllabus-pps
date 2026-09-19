import { writeFileSync } from "node:fs";

import { postgresMetricSql } from "../sql/postgres-templates";

export function writeMetricSql(path: string, metricKey: string): void {
  writeFileSync(path, postgresMetricSql(metricKey));
}
