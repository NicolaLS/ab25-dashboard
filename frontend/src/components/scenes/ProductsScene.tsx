import { Leaderboard } from "../Leaderboard";
import { useProductLeaderboardQuery } from "../../hooks/useDashboardQueries";

type Props = {
  btcPriceUsd?: number;
  isActive: boolean;
};

export function ProductsScene({ btcPriceUsd, isActive }: Props) {
  const transactions = useProductLeaderboardQuery("transactions", isActive);
  const volume = useProductLeaderboardQuery("volume", isActive);

  return (
    <div className="products-scene">
      <div className="products-scene__column">
        <Leaderboard
          metric="transactions"
          rows={transactions.data}
          title="Products · Transactions"
          btcPriceUsd={btcPriceUsd}
        />
        {transactions.isFetching && (
          <div className="loading-indicator">Refreshing…</div>
        )}
        {transactions.isError && (
          <div className="error-indicator">Unable to load products.</div>
        )}
      </div>
      <div className="products-scene__column">
        <Leaderboard
          metric="volume"
          rows={volume.data}
          title="Products · Volume"
          btcPriceUsd={btcPriceUsd}
        />
        {volume.isFetching && (
          <div className="loading-indicator">Refreshing…</div>
        )}
        {volume.isError && (
          <div className="error-indicator">Unable to load products.</div>
        )}
      </div>
    </div>
  );
}
