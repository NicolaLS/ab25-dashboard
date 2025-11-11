import { useState, useEffect } from "react";
import { Leaderboard } from "../Leaderboard";
import { useMerchantLeaderboardQuery, useProductLeaderboardQuery, useSummaryQuery } from "../../hooks/useDashboardQueries";
import { formatWindowLabel } from "../../utils/timeWindow";
import { formatNumber } from "../../utils/format";

type Props = {
  timeWindow: string;
  btcPriceUsd?: number;
  isActive: boolean;
};

type LeaderboardView = "merchants" | "products";

export function MerchantsScene({ timeWindow, btcPriceUsd, isActive }: Props) {
  const [currentView, setCurrentView] = useState<LeaderboardView>("merchants");

  // Merchant queries
  const merchantTxQuery = useMerchantLeaderboardQuery("transactions", timeWindow, isActive);
  const merchantVolQuery = useMerchantLeaderboardQuery("volume", timeWindow, isActive);

  // Product queries
  const productTxQuery = useProductLeaderboardQuery("transactions", isActive);
  const productVolQuery = useProductLeaderboardQuery("volume", isActive);

  const summaryQuery = useSummaryQuery(isActive);
  const emptyMessage = `No activity in the last ${formatWindowLabel(timeWindow)}.`;

  const summary = summaryQuery.data;

  // Auto-rotate between merchants and products every 5 seconds
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCurrentView((prev) => (prev === "merchants" ? "products" : "merchants"));
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="merchants-scene">
      <div className="merchants-scene__kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Active Merchants</span>
          <strong className="kpi-card__value">
            {summary
              ? `${formatNumber(summary.active_merchants)}/${formatNumber(summary.total_merchants)}`
              : "—"}
          </strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Unique Products</span>
          <strong className="kpi-card__value">
            {summary ? formatNumber(summary.unique_products) : "—"}
          </strong>
        </div>
      </div>

      <div className="merchants-scene__leaderboards">
        {/* Merchants View */}
        <div
          className={`merchants-scene__view ${currentView === "merchants" ? "merchants-scene__view--active" : ""}`}
        >
          <div className="merchants-scene__column">
            <Leaderboard
              metric="transactions"
              rows={merchantTxQuery.data}
              title="Merchants · Transactions"
              btcPriceUsd={btcPriceUsd}
              emptyMessage={emptyMessage}
            />
            {merchantTxQuery.isFetching && (
              <div className="loading-indicator">Refreshing…</div>
            )}
            {merchantTxQuery.isError && (
              <div className="error-indicator">Unable to load merchants.</div>
            )}
          </div>
          <div className="merchants-scene__column">
            <Leaderboard
              metric="volume"
              rows={merchantVolQuery.data}
              title="Merchants · Volume"
              btcPriceUsd={btcPriceUsd}
              emptyMessage={emptyMessage}
            />
            {merchantVolQuery.isFetching && (
              <div className="loading-indicator">Refreshing…</div>
            )}
            {merchantVolQuery.isError && (
              <div className="error-indicator">Unable to load merchants.</div>
            )}
          </div>
        </div>

        {/* Products View */}
        <div
          className={`merchants-scene__view ${currentView === "products" ? "merchants-scene__view--active" : ""}`}
        >
          <div className="merchants-scene__column">
            <Leaderboard
              metric="transactions"
              rows={productTxQuery.data}
              title="Products · Transactions"
              btcPriceUsd={btcPriceUsd}
              emptyMessage="No products found."
            />
            {productTxQuery.isFetching && (
              <div className="loading-indicator">Refreshing…</div>
            )}
            {productTxQuery.isError && (
              <div className="error-indicator">Unable to load products.</div>
            )}
          </div>
          <div className="merchants-scene__column">
            <Leaderboard
              metric="volume"
              rows={productVolQuery.data}
              title="Products · Volume"
              btcPriceUsd={btcPriceUsd}
              emptyMessage="No products found."
            />
            {productVolQuery.isFetching && (
              <div className="loading-indicator">Refreshing…</div>
            )}
            {productVolQuery.isError && (
              <div className="error-indicator">Unable to load products.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
