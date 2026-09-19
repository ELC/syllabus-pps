export const PPS_DAC_CONNECTION = "pps_supabase";

export function renderBruinConfig(): string {
  return `default_environment: default

environments:
  default:
    connections:
      postgres:
        - name: ${PPS_DAC_CONNECTION}
          host: \${SUPABASE_DB_HOST}
          port: \${SUPABASE_DB_PORT}
          database: \${SUPABASE_DB_NAME}
          username: \${SUPABASE_DB_USER}
          password: \${SUPABASE_DB_PASSWORD}
          ssl_mode: \${SUPABASE_DB_SSL_MODE}
`;
}
