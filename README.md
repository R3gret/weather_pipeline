# ⛅ Weather Pipeline Dashboard

An automated ETL pipeline that fetches historical weather data from the **Visual Crossing API**, stores it in **Supabase (PostgreSQL)**, and visualizes it in a premium dark-mode **Next.js** dashboard — all orchestrated by **GitHub Actions**.

---

## 📸 Features

- 🌦️ **Automated ETL** — fetches the last 7 days of weather data every 12 hours via GitHub Actions cron
- 📊 **Interactive Charts** — temperature and humidity trend charts powered by Recharts
- 🗃️ **Supabase Backend** — PostgreSQL with RLS, upsert-safe schema, and indexed queries
- 🌍 **Configurable Location** — change the target city via a single GitHub secret (`WEATHER_LOCATION`)
- 🚀 **CI/CD** — lint + build validation runs on every push to `main`
- 🎨 **Premium Dark UI** — glassmorphism header, animated stat cards, responsive layout

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TailwindCSS v4, Recharts |
| Database | Supabase (PostgreSQL) |
| ETL Script | Node.js 22, `@supabase/supabase-js`, `dotenv` |
| Weather API | [Visual Crossing Timeline API](https://www.visualcrossing.com/weather-api) |
| Automation | GitHub Actions (cron + push triggers) |

---

## 📁 Project Structure

```
weather_pipeline/
├── .github/
│   └── workflows/
│       ├── etl-scheduler.yml   # Cron ETL (every 12 hours)
│       └── deploy.yml          # CI/CD on push to main
├── app/
│   ├── globals.css             # Dark-mode design system
│   ├── layout.js               # Root layout + SEO metadata
│   └── page.js                 # Server Component dashboard
├── components/
│   ├── WeatherChart.jsx        # Recharts area charts (client)
│   └── StatCard.jsx            # Summary stat card
├── lib/
│   └── supabase.js             # Supabase client factories
├── scripts/
│   └── etl-pipeline.js         # ETL: Visual Crossing → Supabase
├── database_schema.sql         # Run once in Supabase SQL Editor
├── .env.example                # Environment variable template
└── package.json
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/R3gret/weather_pipeline.git
cd weather_pipeline
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the contents of [`database_schema.sql`](./database_schema.sql)
3. Copy your credentials from **Project Settings → API**

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

VISUAL_CROSSING_API_KEY=your_api_key
WEATHER_LOCATION=Manila
```

### 4. Run the ETL locally

```bash
npm run etl
```

Expected output:
```
🚀 [ETL] Starting weather data pipeline...
🌐 [ETL] Fetching weather data for "Manila" from 2026-07-11 to 2026-07-18...
✅ [ETL] Received 8 day(s) of data.
📦 [ETL] Upserting 8 row(s) into weather_logs...
🎉 [ETL] Pipeline completed successfully in 1.42s.
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## ⚙️ GitHub Actions Setup

Push the repo to GitHub, then add these **Repository Secrets** under:
`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `VISUAL_CROSSING_API_KEY` | Visual Crossing API key |
| `WEATHER_LOCATION` | Target city (e.g. `Manila`, `Tokyo`) |

### Workflows

| Workflow | Trigger | Action |
|---|---|---|
| `etl-scheduler.yml` | Every 12h + manual dispatch | Fetches weather → upserts into Supabase |
| `deploy.yml` | Push to `main` | Lints + builds the Next.js app |

To trigger the ETL manually:
**Actions → 🌦️ ETL — Weather Data Pipeline → Run workflow**

---

## 🗄️ Database Schema

```sql
CREATE TABLE weather_logs (
  id              BIGSERIAL PRIMARY KEY,
  location_name   TEXT          NOT NULL,
  recorded_at     DATE          NOT NULL,
  temperature_c   NUMERIC(5, 2),
  humidity        NUMERIC(5, 2),
  wind_speed_kph  NUMERIC(6, 2),
  condition       TEXT,
  fetched_at      TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (location_name, recorded_at)
);
```

The `UNIQUE` constraint on `(location_name, recorded_at)` makes every ETL run idempotent — re-running never creates duplicates.

---

## 🌍 Changing the Location

To track a different city:

1. Update the `WEATHER_LOCATION` secret in GitHub Actions
2. Update `WEATHER_LOCATION` in your local `.env.local`
3. Trigger a manual ETL run

The dashboard header badge reads the location dynamically from the latest database row — no code changes needed.

---

## 🔐 Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` is **only** used in the server-side ETL script — it never touches the browser
- The frontend uses the **anon key** with Row-Level Security policies that allow public reads
- `.env.local` is in `.gitignore` and is never committed

---

## 📄 License

MIT
