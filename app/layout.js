import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: {
    default: "Weather Pipeline Dashboard",
    template: "%s | WeatherPipeline",
  },
  description:
    "Automated ETL dashboard visualizing historical weather data for Manila. Powered by Visual Crossing API, Supabase, and GitHub Actions.",
  keywords: ["weather", "ETL", "dashboard", "Next.js", "Supabase", "data pipeline"],
  openGraph: {
    title: "Weather Pipeline Dashboard",
    description: "Automated historical weather data visualization pipeline.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
