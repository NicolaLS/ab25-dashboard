const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE_URL = rawApiBase ? rawApiBase.replace(/\/$/, "") : "";

export const PRICE_API_URL =
  import.meta.env.VITE_PRICE_API_URL ||
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

export const TIME_WINDOW_OPTIONS = [
  { value: "5m", label: "Last 5 min" },
  { value: "30m", label: "Last 30 min" },
  { value: "60m", label: "Last 60 min" },
  { value: "all", label: "All time" },
] as const;

export type TimeWindowValue =
  (typeof TIME_WINDOW_OPTIONS)[number]["value"];

export const DEFAULT_TIME_WINDOW: TimeWindowValue = "60m";

export const SCENE_ORDER = [
  { id: "overview", duration: 20000 },
  { id: "merchants-tx", duration: 15000 },
  { id: "merchants-vol", duration: 15000 },
  { id: "products", duration: 15000 },
  { id: "trends", duration: 18000 },
] as const;

export const REFRESH_INTERVALS = {
  summary: 20000,
  ticker: 4000,
  leaderboard: 30000,
  trends: 25000,
  milestones: 5000,
  price: 60000,
};

export const TICKER_LIMIT = 50;
export const LEADERBOARD_LIMIT = 10;
