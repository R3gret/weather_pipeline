import { createPublicSupabaseClient } from "@/lib/supabase";
import WeatherChart from "@/components/WeatherChart";
import StatCard from "@/components/StatCard";
import { format, parseISO } from "date-fns";

// Revalidate every hour so the page always shows fresh data
export const revalidate = 3600;

export const metadata = {
  title: "Weather Pipeline Dashboard",
  description:
    "Automated historical weather data visualization for New York City, powered by Visual Crossing and Supabase.",
};

// ─── Data Fetching ─────────────────────────────────────────────────────────────

async function getWeatherData() {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("weather_logs")
      .select("id, location_name, recorded_at, temperature_c, humidity, wind_speed_kph, condition, fetched_at")
      .order("recorded_at", { ascending: true })
      .limit(30); // Last 30 records

    if (error) {
      console.error("[Page] Supabase fetch error:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("[Page] Unexpected error fetching weather data:", err.message);
    return [];
  }
}

// ─── Derived Stats ─────────────────────────────────────────────────────────────

function computeStats(data) {
  if (!data.length) return null;

  const temps = data.map((d) => d.temperature_c).filter(Boolean);
  const humidities = data.map((d) => d.humidity).filter(Boolean);
  const winds = data.map((d) => d.wind_speed_kph).filter(Boolean);
  const latest = data[data.length - 1];

  return {
    latestTemp: latest.temperature_c?.toFixed(1) ?? "N/A",
    latestCondition: latest.condition ?? "Unknown",
    latestDate: format(parseISO(latest.recorded_at), "EEEE, MMM d"),
    avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
    maxTemp: Math.max(...temps).toFixed(1),
    minTemp: Math.min(...temps).toFixed(1),
    avgHumidity: (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(0),
    avgWind: (winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1),
    recordCount: data.length,
    location: latest.location_name,
    lastFetched: format(parseISO(latest.fetched_at), "MMM d, yyyy HH:mm"),
  };
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const weatherData = await getWeatherData();
  const stats = computeStats(weatherData);

  return (
    <main className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="header__logo">
          <span className="header__logo-icon">⛅</span>
          <span className="header__logo-text">WeatherPipeline</span>
        </div>
        <div className="header__meta">
          {stats && (
            <>
              <span className="header__badge">{stats.location}</span>
              <span className="header__badge header__badge--dim">
                Updated {stats.lastFetched}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="dashboard__content">
        {/* Hero */}
        <section className="hero">
          <div className="hero__text">
            <h1 className="hero__title">Historical Weather Dashboard</h1>
            <p className="hero__subtitle">
              Automated ETL pipeline ingesting real-time data from the Visual Crossing API
              into Supabase — visualized in one place.
            </p>
          </div>
          {stats && (
            <div className="hero__current">
              <p className="hero__current-date">{stats.latestDate}</p>
              <p className="hero__current-temp">{stats.latestTemp}°<span>C</span></p>
              <p className="hero__current-cond">{stats.latestCondition}</p>
            </div>
          )}
        </section>

        {/* Stat Cards */}
        {stats ? (
          <section className="stats-grid">
            <StatCard
              icon="🌡️"
              label="Average Temperature"
              value={stats.avgTemp}
              unit="°C"
              sub={`${stats.recordCount} days recorded`}
              accent="orange"
            />
            <StatCard
              icon="🔥"
              label="Peak Temperature"
              value={stats.maxTemp}
              unit="°C"
              sub="7-day high"
              accent="red"
            />
            <StatCard
              icon="❄️"
              label="Lowest Temperature"
              value={stats.minTemp}
              unit="°C"
              sub="7-day low"
              accent="blue"
            />
            <StatCard
              icon="💧"
              label="Avg Humidity"
              value={stats.avgHumidity}
              unit="%"
              sub="Relative humidity"
              accent="cyan"
            />
            <StatCard
              icon="💨"
              label="Avg Wind Speed"
              value={stats.avgWind}
              unit=" kph"
              sub="Daily average"
              accent="purple"
            />
            <StatCard
              icon="📡"
              label="Data Points"
              value={stats.recordCount}
              unit=""
              sub="Rows in Supabase"
              accent="green"
            />
          </section>
        ) : (
          <div className="empty-state">
            <p className="empty-state__icon">🌫️</p>
            <h2 className="empty-state__title">No Data Yet</h2>
            <p className="empty-state__desc">
              Run <code>node scripts/etl-pipeline.js</code> to populate the database.
            </p>
          </div>
        )}

        {/* Charts */}
        <section className="chart-card">
          <div className="chart-card__header">
            <h2 className="chart-card__title">Weather Trends</h2>
            <p className="chart-card__subtitle">Historical data from Supabase</p>
          </div>
          <WeatherChart data={weatherData} />
        </section>

        {/* Data Table */}
        {weatherData.length > 0 && (
          <section className="table-card">
            <div className="table-card__header">
              <h2 className="table-card__title">Raw Data Log</h2>
              <p className="table-card__subtitle">{weatherData.length} records</p>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Temp (°C)</th>
                    <th>Humidity (%)</th>
                    <th>Wind (kph)</th>
                    <th>Condition</th>
                    <th>Fetched</th>
                  </tr>
                </thead>
                <tbody>
                  {[...weatherData].reverse().map((row) => (
                    <tr key={row.id}>
                      <td className="table-date">
                        {format(parseISO(row.recorded_at), "MMM d, yyyy")}
                      </td>
                      <td className="table-temp">
                        {row.temperature_c?.toFixed(1) ?? "—"}°
                      </td>
                      <td>{row.humidity?.toFixed(0) ?? "—"}%</td>
                      <td>{row.wind_speed_kph?.toFixed(1) ?? "—"}</td>
                      <td className="table-condition">{row.condition ?? "—"}</td>
                      <td className="table-fetched">
                        {format(parseISO(row.fetched_at), "MMM d HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="dashboard__footer">
        <p>
          Powered by{" "}
          <a href="https://www.visualcrossing.com/" target="_blank" rel="noopener noreferrer">
            Visual Crossing
          </a>{" "}
          ·{" "}
          <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer">
            Supabase
          </a>{" "}
          · Automated via GitHub Actions
        </p>
      </footer>
    </main>
  );
}
