import { createPublicSupabaseClient } from "@/lib/supabase";
import WeatherChart from "@/components/WeatherChart";
import StatCard from "@/components/StatCard";
import AIInsights from "@/components/AIInsights";
import { format, parseISO } from "date-fns";
import { unstable_cache } from "next/cache";

// Revalidate every hour so the page always shows fresh data
export const revalidate = 3600;

export const metadata = {
  title: "Weather Pipeline Dashboard",
  description:
    "Automated historical weather data visualization for Manila, powered by Visual Crossing and Supabase.",
};

// ─── Data Fetching ─────────────────────────────────────────────────────────────

async function getWeatherData() {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("weather_logs")
      .select("id, location_name, recorded_at, temperature_c, humidity, wind_speed_kph, condition, fetched_at")
      .eq("location_name", "Manila")
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

// ─── AI Insight ────────────────────────────────────────────────────────────────

// The actual OpenRouter fetch — extracted so unstable_cache can wrap it.
// `lastFetched` is the latest fetched_at from the weather DB row, used as the
// cache key so a new insight is only generated when new weather data arrives.
async function fetchInsightFromOpenRouter(stats, lastFetched) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { insight: null, model: null, error: "OpenRouter API key not configured." };

  const prompt = `You are a weather analyst writing a brief insight for a public dashboard. Using the data below for ${stats.location}, write exactly ONE paragraph (5-7 sentences). Summarize the temperature range, what the humidity and wind mean for comfort, the current condition, and one practical tip for residents. Be conversational and specific — no bullet points, no headers, no lists.

Data:
- Period: ${stats.recordCount} days (latest: ${stats.latestDate})
- Current: ${stats.latestCondition}, ${stats.latestTemp}°C
- Temp range: ${stats.minTemp}°C low / ${stats.avgTemp}°C avg / ${stats.maxTemp}°C high
- Humidity: ${stats.avgHumidity}% | Wind: ${stats.avgWind} kph`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://weather-pipeline.vercel.app",
        "X-Title": "Weather Pipeline Dashboard",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10000,
        temperature: 0.7,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[AIInsight] OpenRouter error:", res.status, errText);
      return { insight: null, model: null, error: `OpenRouter returned ${res.status}.` };
    }

    const json = await res.json();
    // Strip <think>...</think> reasoning blocks (some models include these)
    const raw = json.choices?.[0]?.message?.content ?? "";
    const insight = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const usedModel = json.model ?? "Free (auto-routed)";

    console.log(`[AIInsight] Generated for fetched_at=${lastFetched}, model=${usedModel}`);
    return { insight: insight || null, model: usedModel, error: null };
  } catch (err) {
    console.error("[AIInsight] Fetch failed:", err.message);
    return { insight: null, model: null, error: "Failed to reach OpenRouter." };
  }
}

// Cached wrapper — keyed on lastFetched so the insight is only regenerated
// when the ETL pipeline writes new weather data. All page visits in between
// receive the cached result instantly with zero OpenRouter calls.
async function getWeatherInsight(stats) {
  if (!stats) return { insight: null, model: null, error: null };

  const cachedFetch = unstable_cache(
    () => fetchInsightFromOpenRouter(stats, stats.lastFetched),
    ["weather-insight", stats.lastFetched], // cache key changes only on new fetch
    { revalidate: false }                   // never expire — key rotation handles freshness
  );

  return cachedFetch();
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
  const { insight, model: insightModel, error: insightError } = await getWeatherInsight(stats);

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

        {/* AI Insights */}
        <AIInsights
          insight={insight}
          model={insightModel}
          error={insightError}
        />

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
