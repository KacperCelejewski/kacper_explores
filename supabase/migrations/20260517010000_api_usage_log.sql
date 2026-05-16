-- Logs every RapidAPI flight search attempt (hit = from cache, miss = real API call)
CREATE TABLE IF NOT EXISTS api_usage_log (
  id         bigserial   PRIMARY KEY,
  called_at  timestamptz NOT NULL DEFAULT now(),
  cache_key  text        NOT NULL,
  origin     text        NOT NULL,
  dest       text        NOT NULL,
  month      int         NOT NULL,
  hit        boolean     NOT NULL  -- true = served from cache, false = actual API call
);

CREATE INDEX IF NOT EXISTS api_usage_log_called_at ON api_usage_log (called_at DESC);

-- Tracks when alert emails were sent (to avoid spam — max 1/day)
CREATE TABLE IF NOT EXISTS api_alert_log (
  id        bigserial   PRIMARY KEY,
  sent_at   timestamptz NOT NULL DEFAULT now(),
  threshold int         NOT NULL  -- % threshold that triggered the alert
);

ALTER TABLE api_usage_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_alert_log  ENABLE ROW LEVEL SECURITY;
-- No policies = service role only
