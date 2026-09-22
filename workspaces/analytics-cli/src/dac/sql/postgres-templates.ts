import { staticFilterAllValue } from "@pps/core";

export function postgresMetricSql(metricKey: string): string {
  return `SELECT value
FROM public.analytics_dac_metrics
WHERE metric_key = '${metricKey}'
`;
}

export function postgresDatasetSql(dataset: string, columns: string[]): string {
  const selects = columns
    .map((column) => `  row_data->>'${column}' AS ${column}`)
    .join(",\n");
  return `SELECT
${selects}
FROM public.analytics_dac_rows
WHERE dataset = '${dataset}'
`;
}

export function postgresDiagnosticsSql(): string {
  return `${postgresDatasetSql("quality.diagnostics", ["severity", "code", "page", "line", "message"])}
  AND ('{{ filters.severity }}' = '${staticFilterAllValue}' OR row_data->>'severity' = '{{ filters.severity }}')
  AND ('{{ filters.code }}' = '${staticFilterAllValue}' OR row_data->>'code' = '{{ filters.code }}')
  AND ('{{ filters.page }}' = '${staticFilterAllValue}' OR row_data->>'page' = '{{ filters.page }}')
ORDER BY row_data->>'severity', row_data->>'code', row_data->>'page', row_data->>'line'
`;
}

export function postgresExpectedCurriculumSql(): string {
  return `${postgresDatasetSql("curriculum-map.expected-curriculum", ["year", "course", "concept"])}
  AND ('{{ filters.year }}' = '${staticFilterAllValue}' OR row_data->>'year' = '{{ filters.year }}')
  AND ('{{ filters.course }}' = '${staticFilterAllValue}' OR row_data->>'course' = '{{ filters.course }}')
  AND ('{{ filters.concept }}' = '${staticFilterAllValue}' OR row_data->>'concept' = '{{ filters.concept }}')
ORDER BY row_data->>'year', row_data->>'course', row_data->>'concept'
`;
}

export function postgresConceptSourcesSql(): string {
  return `${postgresDatasetSql("concept-map.concept-sources", [
    "concept",
    "source_type",
    "source",
    "line",
  ])}
  AND ('{{ filters.source_type }}' = '${staticFilterAllValue}' OR row_data->>'source_type' = '{{ filters.source_type }}')
ORDER BY row_data->>'concept', row_data->>'source_type', row_data->>'source'
`;
}
