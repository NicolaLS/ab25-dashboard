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

export const DEFAULT_TIME_WINDOW: TimeWindowValue = "all";

export const SCENE_ORDER = [
	{ id: "overview", duration: 10000 },
	{ id: "merchants", duration: 10000 },
	{ id: "wifi", duration: 10000 },
] as const;

const DEFAULT_REFRESH = 10000;

export const REFRESH_INTERVALS = {
	summary: DEFAULT_REFRESH,
	ticker: DEFAULT_REFRESH,
	leaderboard: DEFAULT_REFRESH,
	trends: DEFAULT_REFRESH,
	milestones: DEFAULT_REFRESH,
	price: DEFAULT_REFRESH,
};

export const TICKER_LIMIT = 50;
export const LEADERBOARD_LIMIT = 10;
