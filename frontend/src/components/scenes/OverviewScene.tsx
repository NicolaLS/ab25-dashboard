import type { Summary, TickerEntry } from "../../types";
import { KpiGrid } from "../KpiGrid";
import { Ticker } from "../Ticker";
import type { TrendPoint } from "../../utils/data";

type Props = {
  summary?: Summary;
  ticker?: TickerEntry[];
  btcPriceUsd?: number;
  trendSeries?: TrendPoint[];
};

export function OverviewScene({
  summary,
  ticker,
  btcPriceUsd,
  trendSeries,
}: Props) {
  return (
    <div className="overview-scene">
      <KpiGrid summary={summary} btcPriceUsd={btcPriceUsd} trendSeries={trendSeries} />
      <Ticker entries={ticker} btcPriceUsd={btcPriceUsd} />
    </div>
  );
}
