-- Atomic daily API call counter shared across all serverless instances.
-- Replaces the in-process dailyCallCount variable which resets per instance.
CREATE TABLE IF NOT EXISTS flight_api_counter (
  date       date    PRIMARY KEY DEFAULT CURRENT_DATE,
  call_count integer NOT NULL    DEFAULT 0
);

ALTER TABLE flight_api_counter ENABLE ROW LEVEL SECURITY;

-- Atomically increments today's counter and returns true if still within cap.
CREATE OR REPLACE FUNCTION increment_flight_api_counter(p_cap integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO flight_api_counter (date, call_count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) DO UPDATE
    SET call_count = flight_api_counter.call_count + 1
  RETURNING call_count INTO v_count;
  RETURN v_count <= p_cap;
END;
$$;
