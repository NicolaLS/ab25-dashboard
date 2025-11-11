import { API_BASE_URL, LEADERBOARD_LIMIT, TICKER_LIMIT } from "../config";
import type {
  LeaderboardMetric,
  MerchantLeaderboardRow,
  MilestoneTrigger,
  ProductLeaderboardRow,
  Summary,
  TickerEntry,
} from "../types";

type FetchOptions = {
  params?: Record<string, string | number | undefined>;
};

async function request<T>(path: string, opts?: FetchOptions): Promise<T> {
  const base =
    API_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
  const url = new URL(path, base);
  if (opts?.params) {
    Object.entries(opts.params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchSummary() {
  return request<Summary>("/v1/summary");
}

export function fetchTicker(limit = TICKER_LIMIT) {
  return request<TickerEntry[]>("/v1/ticker", { params: { limit } });
}

export function fetchMerchantLeaderboard(metric: LeaderboardMetric, window?: string) {
  const params: Record<string, string | number | undefined> = {
    metric,
    limit: LEADERBOARD_LIMIT,
  };
  if (window) {
    params.window = window;
  }
  return request<MerchantLeaderboardRow[]>("/v1/leaderboard/merchants", { params });
}

export function fetchProductLeaderboard(metric: LeaderboardMetric) {
  return request<ProductLeaderboardRow[]>("/v1/leaderboard/products", {
    params: { metric, limit: LEADERBOARD_LIMIT },
  });
}

export function fetchMilestoneTriggers(since: string) {
  return request<MilestoneTrigger[]>("/v1/milestones/triggers", {
    params: { since },
  });
}
