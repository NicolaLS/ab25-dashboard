import { API_BASE_URL, LEADERBOARD_LIMIT, TICKER_LIMIT } from "../config";
import type {
  LeaderboardMetric,
  MerchantLeaderboardRow,
  MilestoneTrigger,
  ProductLeaderboardRow,
  Summary,
  TickerEntry,
  WifiConfig,
  Scene,
  SceneInput,
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

export function fetchWifiConfig() {
  return request<WifiConfig>("/v1/wifi/config");
}

export function fetchWifiSummary() {
  return request<Summary>("/v1/summary", { params: { source: "wifi" } });
}

export function fetchWifiTicker(limit = TICKER_LIMIT) {
  return request<TickerEntry[]>("/v1/ticker", { params: { limit, source: "wifi" } });
}

export function fetchScenes() {
  return request<Scene[]>("/v1/scenes");
}

export function fetchScenesAdmin(token: string) {
  return requestWithAuth<Scene[]>("/v1/admin/scenes", token);
}

export function createScene(token: string, scene: SceneInput) {
  return requestWithAuth<Scene>("/v1/admin/scenes", token, {
    method: "POST",
    body: JSON.stringify(scene),
  });
}

export function updateScene(token: string, id: string, scene: Partial<SceneInput>) {
  return requestWithAuth<Scene>(`/v1/admin/scenes/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(scene),
  });
}

export function deleteScene(token: string, id: string) {
  return requestWithAuth<{ message: string }>(`/v1/admin/scenes/${id}`, token, {
    method: "DELETE",
  });
}

async function requestWithAuth<T>(
  path: string,
  token: string,
  opts?: RequestInit
): Promise<T> {
  const base =
    API_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
  const url = new URL(path, base);
  const response = await fetch(url.toString(), {
    ...opts,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
