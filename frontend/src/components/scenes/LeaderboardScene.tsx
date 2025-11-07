import type { LeaderboardMetric } from "../../types";
import {
  useMerchantLeaderboardQuery,
  useProductLeaderboardQuery,
} from "../../hooks/useDashboardQueries";
import { Leaderboard } from "../Leaderboard";
import { formatWindowLabel } from "../../utils/timeWindow";

type Props = {
  entity: "merchants" | "products";
  metric: LeaderboardMetric;
  title: string;
  timeWindow: string;
  btcPriceUsd?: number;
  isActive: boolean;
};

export function LeaderboardScene({
  entity,
  metric,
  title,
  timeWindow,
  btcPriceUsd,
  isActive,
}: Props) {
  const query =
    entity === "merchants"
      ? useMerchantLeaderboardQuery(metric, timeWindow, isActive)
      : useProductLeaderboardQuery(metric, isActive);
  const emptyMessage =
    entity === "merchants"
      ? `No activity in the last ${formatWindowLabel(timeWindow)}.`
      : undefined;

  return (
    <div className="leaderboard-scene">
      <Leaderboard
        metric={metric}
        rows={query.data}
        title={title}
        btcPriceUsd={btcPriceUsd}
        emptyMessage={emptyMessage}
      />
      {query.isFetching && <div className="loading-indicator">Refreshing…</div>}
      {query.isError && <div className="error-indicator">Unable to load leaderboard.</div>}
    </div>
  );
}
