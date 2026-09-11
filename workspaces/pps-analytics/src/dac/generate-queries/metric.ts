import { writeFileSync } from "node:fs";

export function writeMetricSql(path: string, value: number | string): void {
  writeFileSync(path, `SELECT ${value} AS value\n`);
}
