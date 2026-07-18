#!/usr/bin/env node

/**
 * ETL Pipeline — Visual Crossing → Supabase
 * ─────────────────────────────────────────
 * Fetches the last 7 days of historical weather data for a given location
 * from the Visual Crossing Timeline API, transforms the response into rows
 * matching the `weather_logs` schema, and upserts them into Supabase.
 *
 * Usage:
 *   node scripts/etl-pipeline.js
 *
 * Required environment variables (set in .env.local or GitHub Actions secrets):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VISUAL_CROSSING_API_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ─── Configuration ────────────────────────────────────────────────────────────

const LOCATION = process.env.WEATHER_LOCATION || 'New York';
const LOCATION_ENCODED = encodeURIComponent(LOCATION);
const DAYS_BACK = 7;
const VC_BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

// ─── Environment Variable Validation ─────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VC_API_KEY = process.env.VISUAL_CROSSING_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VC_API_KEY) {
  console.error('❌ [ETL] Missing required environment variables.');
  console.error('   Ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VISUAL_CROSSING_API_KEY are set.');
  process.exit(1);
}

// ─── Supabase Client (Service Role — bypasses RLS) ───────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Build the date range for the API query.
 * Returns { startDate, endDate } as 'YYYY-MM-DD' strings.
 */
function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - DAYS_BACK);

  const fmt = (d) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

/**
 * Convert Fahrenheit to Celsius (Visual Crossing default unit is US/imperial).
 */
function fahrenheitToCelsius(f) {
  return parseFloat(((f - 32) * 5 / 9).toFixed(2));
}

// ─── Fetch Weather Data ───────────────────────────────────────────────────────

async function fetchWeatherData(startDate, endDate) {
  const url = `${VC_BASE_URL}/${LOCATION_ENCODED}/${startDate}/${endDate}` +
    `?unitGroup=us&include=days&key=${VC_API_KEY}&contentType=json`;

  console.log(`🌐 [ETL] Fetching weather data for "${LOCATION}" from ${startDate} to ${endDate}...`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Visual Crossing API error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ [ETL] Received ${data.days?.length ?? 0} day(s) of data.`);
  return data;
}

// ─── Transform API Response ───────────────────────────────────────────────────

/**
 * Maps Visual Crossing API day objects to weather_logs schema rows.
 */
function transformToRows(apiData) {
  if (!apiData.days || apiData.days.length === 0) {
    throw new Error('API response contained no day records.');
  }

  return apiData.days.map((day) => ({
    location_name: LOCATION,
    recorded_at: day.datetime,                          // 'YYYY-MM-DD'
    temperature_c: fahrenheitToCelsius(day.temp),       // avg temp for the day
    humidity: day.humidity ?? null,                     // relative humidity %
    wind_speed_kph: day.windspeed                       // already in mph; convert below
      ? parseFloat((day.windspeed * 1.60934).toFixed(2))
      : null,
    condition: day.conditions ?? null,                  // descriptive string
  }));
}

// ─── Upsert into Supabase ─────────────────────────────────────────────────────

async function upsertRows(rows) {
  console.log(`📦 [ETL] Upserting ${rows.length} row(s) into weather_logs...`);

  const { data, error } = await supabase
    .from('weather_logs')
    .upsert(rows, {
      onConflict: 'location_name,recorded_at', // matches the UNIQUE constraint
      ignoreDuplicates: false,                  // update existing rows
    })
    .select('id, recorded_at');

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`✅ [ETL] Successfully upserted ${data?.length ?? rows.length} row(s).`);
  return data;
}

// ─── Main Entrypoint ──────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 [ETL] Starting weather data pipeline...');
  const startTime = Date.now();

  try {
    // 1. Determine date range
    const { startDate, endDate } = getDateRange();

    // 2. Fetch from Visual Crossing
    const apiData = await fetchWeatherData(startDate, endDate);

    // 3. Transform to DB rows
    const rows = transformToRows(apiData);
    console.log(`🔄 [ETL] Transformed ${rows.length} rows. Sample:`, rows[0]);

    // 4. Upsert into Supabase
    await upsertRows(rows);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 [ETL] Pipeline completed successfully in ${elapsed}s.`);
  } catch (err) {
    console.error('❌ [ETL] Pipeline failed:', err.message);
    process.exit(1);
  }
}

main();
