-- ============================================================
--  Weather Pipeline — Database Schema
--  Run this in your Supabase SQL Editor to create the table.
-- ============================================================

CREATE TABLE IF NOT EXISTS weather_logs (
  id              BIGSERIAL PRIMARY KEY,
  location_name   TEXT          NOT NULL,
  recorded_at     DATE          NOT NULL,
  temperature_c   NUMERIC(5, 2),
  humidity        NUMERIC(5, 2),
  wind_speed_kph  NUMERIC(6, 2),
  condition       TEXT,
  fetched_at      TIMESTAMPTZ   DEFAULT NOW(),

  -- Prevent duplicate entries for the same location + date
  CONSTRAINT weather_logs_location_date_unique UNIQUE (location_name, recorded_at)
);

-- Index for fast dashboard queries ordered by date
CREATE INDEX IF NOT EXISTS idx_weather_logs_recorded_at
  ON weather_logs (recorded_at DESC);

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_weather_logs_location
  ON weather_logs (location_name);

-- ============================================================
--  Optional: Enable Row-Level Security (RLS)
--  The ETL script uses the service-role key which bypasses RLS.
--  The frontend anon key needs a policy to read data.
-- ============================================================

ALTER TABLE weather_logs ENABLE ROW LEVEL SECURITY;

-- Allow all anonymous/authenticated users to SELECT rows
CREATE POLICY "Allow public read access"
  ON weather_logs
  FOR SELECT
  USING (true);
