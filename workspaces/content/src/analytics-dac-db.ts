import type { SupabaseClient } from "@supabase/supabase-js";

export const ANALYTICS_DAC_METRICS_TABLE = "analytics_dac_metrics";
export const ANALYTICS_DAC_ROWS_TABLE = "analytics_dac_rows";

export interface DacRowRecord {
  dataset: string;
  row_data: Record<string, string>;
}

export async function replaceDacAnalyticsData(
  client: SupabaseClient,
  input: {
    metrics: Record<string, number | string>;
    rows: DacRowRecord[];
  },
): Promise<void> {
  const metricRows = Object.entries(input.metrics).map(([metric_key, value]) => ({
    metric_key,
    value: Number(value),
  }));

  const { error: deleteMetricsError } = await client
    .from(ANALYTICS_DAC_METRICS_TABLE)
    .delete()
    .neq("metric_key", "");

  if (deleteMetricsError) {
    throw new Error(deleteMetricsError.message);
  }

  if (metricRows.length > 0) {
    const { error: metricsError } = await client
      .from(ANALYTICS_DAC_METRICS_TABLE)
      .upsert(metricRows, { onConflict: "metric_key" });

    if (metricsError) {
      throw new Error(metricsError.message);
    }
  }

  const { error: deleteRowsError } = await client
    .from(ANALYTICS_DAC_ROWS_TABLE)
    .delete()
    .neq("dataset", "");

  if (deleteRowsError) {
    throw new Error(deleteRowsError.message);
  }

  if (input.rows.length > 0) {
    const { error: rowsError } = await client.from(ANALYTICS_DAC_ROWS_TABLE).insert(input.rows);

    if (rowsError) {
      throw new Error(rowsError.message);
    }
  }
}
