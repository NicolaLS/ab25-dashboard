import type { LeaderboardMetric } from "../../types";
import { useMerchantLeaderboardQuery } from "../../hooks/useDashboardQueries";
import { Leaderboard } from "../Leaderboard";
import { formatWindowLabel } from "../../utils/timeWindow";

type Props = {
  metric: LeaderboardMetric;
  title: string;
  timeWindow: string;
  btcPriceUsd?: number;
  isActive: boolean;
};

export function LeaderboardScene({
  metric,
  title,
  timeWindow,
  btcPriceUsd,
  isActive,
}: Props) {
  const query = useMerchantLeaderboardQuery(metric, timeWindow, isActive);
  const emptyMessage = `No activity in the last ${formatWindowLabel(timeWindow)}.`;

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
