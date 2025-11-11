import type { Summary, TickerEntry } from "../types";
import { KpiGrid } from "./KpiGrid";
import { Ticker } from "./Ticker";
import { Leaderboard } from "./Leaderboard";
import {
  useMerchantLeaderboardQuery,
  useProductLeaderboardQuery,
} from "../hooks/useDashboardQueries";
import { formatWindowLabel } from "../utils/timeWindow";
import { useDashboardContext } from "../context/DashboardContext";

type Props = {
  summary?: Summary;
  ticker?: TickerEntry[];
  btcPriceUsd?: number;
};

export function AttendeeView({
  summary,
  ticker,
  btcPriceUsd,
}: Props) {
  const { timeWindow } = useDashboardContext();
  const merchants = useMerchantLeaderboardQuery(
    "transactions",
    timeWindow,
    true,
  );
  const products = useProductLeaderboardQuery("volume", true);

  return (
    <div className="attendee-view">
      <section>
        <KpiGrid summary={summary} btcPriceUsd={btcPriceUsd} />
      </section>
      <section className="attendee-view__split">
        <Ticker entries={ticker ?? []} btcPriceUsd={btcPriceUsd} />
        <Leaderboard
          title="Top Merchants"
          rows={merchants.data ?? []}
          metric="transactions"
          btcPriceUsd={btcPriceUsd}
          emptyMessage={`No activity in the last ${formatWindowLabel(timeWindow)}.`}
        />
        <Leaderboard
          title="Top Products"
          rows={products.data ?? []}
          metric="volume"
          btcPriceUsd={btcPriceUsd}
        />
      </section>
    </div>
  );
}
