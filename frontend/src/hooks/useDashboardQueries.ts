import { useQuery } from "@tanstack/react-query";
import {
  fetchMerchantLeaderboard,
  fetchProductLeaderboard,
  fetchSummary,
  fetchTicker,
} from "../api/client";
import type { LeaderboardMetric } from "../types";
import { REFRESH_INTERVALS } from "../config";

export function useSummaryQuery(active: boolean) {
  return useQuery({
    queryKey: ["summary"],
    queryFn: fetchSummary,
    refetchInterval: active ? REFRESH_INTERVALS.summary : false,
    staleTime: REFRESH_INTERVALS.summary,
    refetchOnWindowFocus: false,
  });
}

export function useTickerQuery(active: boolean) {
  return useQuery({
    queryKey: ["ticker"],
    queryFn: () => fetchTicker(),
    refetchInterval: active ? REFRESH_INTERVALS.ticker : REFRESH_INTERVALS.ticker * 2,
    staleTime: REFRESH_INTERVALS.ticker,
    refetchOnWindowFocus: false,
  });
}

export function useMerchantLeaderboardQuery(
  metric: LeaderboardMetric,
  window: string,
  active: boolean,
) {
  const apiWindow = window === "all" ? undefined : window;
  return useQuery({
    queryKey: ["leaderboard-merchants", metric, window || "all"],
    queryFn: () => fetchMerchantLeaderboard(metric, apiWindow),
    refetchInterval: active ? REFRESH_INTERVALS.leaderboard : false,
    staleTime: REFRESH_INTERVALS.leaderboard,
    refetchOnWindowFocus: false,
  });
}

export function useProductLeaderboardQuery(
  metric: LeaderboardMetric,
  active: boolean,
) {
  return useQuery({
    queryKey: ["leaderboard-products", metric],
    queryFn: () => fetchProductLeaderboard(metric),
    refetchInterval: active ? REFRESH_INTERVALS.leaderboard : false,
    staleTime: REFRESH_INTERVALS.leaderboard,
    refetchOnWindowFocus: false,
  });
}
