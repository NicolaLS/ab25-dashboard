import type { Summary, TickerEntry } from "../../types";
import { KpiGrid } from "../KpiGrid";
import { Ticker } from "../Ticker";
import { TrendsChart } from "../TrendsChart";
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
      <div className="overview-scene__main">
        {/* Main KPIs at top - spans all 3 columns */}
        <div className="overview-scene__main-kpis">
          <KpiGrid
            summary={summary}
            btcPriceUsd={btcPriceUsd}
            trendSeries={trendSeries}
            showBaseMetrics={true}
            showMerchantMetrics={false}
            showRateMetrics={false}
          />
        </div>

        {/* Pulse chart - spans columns 1-2 */}
        <div className="overview-scene__bottom">
          <div className="overview-scene__pulse">
            <TrendsChart data={trendSeries ?? []} />
          </div>
        </div>

        {/* Rate KPIs - column 3 */}
        <div className="overview-scene__rate-kpis-wrapper">
          <div className="overview-scene__rate-kpis">
            <KpiGrid
              summary={summary}
              btcPriceUsd={btcPriceUsd}
              trendSeries={trendSeries}
              showBaseMetrics={false}
              showMerchantMetrics={false}
              showRateMetrics={true}
            />
          </div>
        </div>
      </div>
      <Ticker entries={ticker} btcPriceUsd={btcPriceUsd} />
    </div>
  );
}
