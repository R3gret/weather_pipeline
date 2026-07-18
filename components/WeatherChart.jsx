"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { format, parseISO } from "date-fns";

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="tooltip-card">
      <p className="tooltip-date">
        {label ? format(parseISO(label), "EEE, MMM d") : ""}
      </p>
      <div className="tooltip-row">
        <span className="tooltip-dot temp" />
        <span className="tooltip-label">Temperature</span>
        <span className="tooltip-value">{payload[0]?.value?.toFixed(1)}°C</span>
      </div>
      {payload[1] && (
        <div className="tooltip-row">
          <span className="tooltip-dot humidity" />
          <span className="tooltip-label">Humidity</span>
          <span className="tooltip-value">{payload[1]?.value?.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Chart Component ─────────────────────────────────────────────────────

export default function WeatherChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <span className="chart-empty-icon">📭</span>
        <p>No weather data available yet.</p>
        <p className="chart-empty-hint">Run the ETL pipeline to populate data.</p>
      </div>
    );
  }

  const chartData = data.map((row) => ({
    date: row.recorded_at,
    temp: row.temperature_c,
    humidity: row.humidity,
    condition: row.condition,
  }));

  const avgTemp =
    chartData.reduce((sum, d) => sum + (d.temp || 0), 0) / chartData.length;

  return (
    <div className="chart-wrapper">
      {/* Temperature Chart */}
      <div className="chart-section">
        <h3 className="chart-section-title">
          <span className="chart-icon">🌡️</span> Temperature Trend (°C)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => format(parseISO(v), "MMM d")}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              unit="°"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avgTemp}
              stroke="#64748b"
              strokeDasharray="4 4"
              label={{ value: `Avg ${avgTemp.toFixed(1)}°`, fill: "#64748b", fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="temp"
              stroke="#f97316"
              strokeWidth={2.5}
              fill="url(#tempGradient)"
              dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#fb923c", strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Humidity Chart */}
      <div className="chart-section">
        <h3 className="chart-section-title">
          <span className="chart-icon">💧</span> Humidity (%)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => format(parseISO(v), "MMM d")}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              unit="%"
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="humidity"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fill="url(#humidGradient)"
              dot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#7dd3fc", strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
