import type {
  LeaderboardMetric,
  MerchantLeaderboardRow,
  ProductLeaderboardRow,
} from "../types";
import { formatNumber, satsToUsd, formatCurrency } from "../utils/format";

type BaseProps = {
  metric: LeaderboardMetric;
  rows?: Array<MerchantLeaderboardRow | ProductLeaderboardRow>;
  title: string;
  btcPriceUsd?: number;
  emptyMessage?: string;
};

type AnyRow = MerchantLeaderboardRow | ProductLeaderboardRow;

export function Leaderboard({
  metric,
  rows,
  title,
  btcPriceUsd,
  emptyMessage,
}: BaseProps) {
  const safeRows: AnyRow[] = Array.isArray(rows) ? rows : [];
  const emptyText = emptyMessage ?? "No data yet";
  return (
    <div className="leaderboard">
      <div className="leaderboard__title">{title}</div>
      <div className="leaderboard__header">
        <span>#</span>
        <span>Name</span>
        <span>{metric === "transactions" ? "Transactions" : "Volume (sats)"}</span>
      </div>
      <div className="leaderboard__body">
        {safeRows.map((row, index) => {
          const volume = row.volume_sats ?? 0;
          const usd = satsToUsd(volume, btcPriceUsd ?? 0);
          const displayName =
            "alias" in row ? row.alias : (row as ProductLeaderboardRow).name;
          return (
            <div className="leaderboard__row" key={`${displayName}-${index}`}>
              <span className="leaderboard__rank">{index + 1}</span>
              <span className="leaderboard__name">{displayName}</span>
              <span className="leaderboard__metric">
                {metric === "transactions"
                  ? formatNumber(row.transactions)
                  : `${formatNumber(volume)} sats${
                      usd ? ` · ${formatCurrency(usd)}` : ""
                    }`}
              </span>
            </div>
          );
        })}
        {!safeRows.length && <div className="leaderboard__empty">{emptyText}</div>}
      </div>
    </div>
  );
}
