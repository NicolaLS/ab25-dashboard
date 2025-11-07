import { Leaderboard } from "../Leaderboard";
import { useMerchantLeaderboardQuery } from "../../hooks/useDashboardQueries";
import { formatWindowLabel } from "../../utils/timeWindow";

type Props = {
  timeWindow: string;
  btcPriceUsd?: number;
  isActive: boolean;
};

export function MerchantsScene({ timeWindow, btcPriceUsd, isActive }: Props) {
  const txQuery = useMerchantLeaderboardQuery("transactions", timeWindow, isActive);
  const volQuery = useMerchantLeaderboardQuery("volume", timeWindow, isActive);
  const emptyMessage = `No activity in the last ${formatWindowLabel(timeWindow)}.`;

  return (
    <div className="merchants-scene">
      <div className="merchants-scene__column">
        <Leaderboard
          metric="transactions"
          rows={txQuery.data}
          title="Merchants · Transactions"
          btcPriceUsd={btcPriceUsd}
          emptyMessage={emptyMessage}
        />
        {txQuery.isFetching && (
          <div className="loading-indicator">Refreshing…</div>
        )}
        {txQuery.isError && (
          <div className="error-indicator">Unable to load merchants.</div>
        )}
      </div>
      <div className="merchants-scene__column">
        <Leaderboard
          metric="volume"
          rows={volQuery.data}
          title="Merchants · Volume"
          btcPriceUsd={btcPriceUsd}
          emptyMessage={emptyMessage}
        />
        {volQuery.isFetching && (
          <div className="loading-indicator">Refreshing…</div>
        )}
        {volQuery.isError && (
          <div className="error-indicator">Unable to load merchants.</div>
        )}
      </div>
    </div>
  );
}
