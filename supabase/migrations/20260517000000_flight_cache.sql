-- Flight search results cache (shared across serverless instances)
-- cache_key: "{origin}-{dest}-{YYYY-MM}" e.g. "WRO-LIS-2026-06"
CREATE TABLE IF NOT EXISTS flight_cache (
  cache_key  text        PRIMARY KEY,
  flights    jsonb       NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-clean expired rows (runs on read, but also clean up older than 48h)
CREATE INDEX IF NOT EXISTS flight_cache_expires_at ON flight_cache (expires_at);

-- Service role can read/write; anon has no access
ALTER TABLE flight_cache ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role can access (via SUPABASE_SERVICE_ROLE_KEY)
