export function renderBruinConfig(): string {
  return `default_environment: default

environments:
  default:
    connections:
      duckdb:
        - name: local_duckdb
          path: data/pps-analytics.duckdb
          read_only: false
`;
}
