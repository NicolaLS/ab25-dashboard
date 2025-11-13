import type { Summary } from "../types";
import { formatNumber } from "../utils/format";
import { Sparkline } from "./Sparkline";
import type { TrendPoint } from "../utils/data";

type Props = {
  summary?: Summary;
  btcPriceUsd?: number;
  trendSeries?: TrendPoint[];
  showBaseMetrics?: boolean;
  showMerchantMetrics?: boolean;
  showRateMetrics?: boolean;
};

export function KpiGrid({
  summary,
  trendSeries = [],
  showBaseMetrics = true,
  showMerchantMetrics = true,
  showRateMetrics = true
}: Props) {
  const txSparkline = trendSeries.map((point) => point.txCount);
  const volSparkline = trendSeries.map((point) => point.volume);

  const allKpis = [
    ...(showBaseMetrics ? [
      {
        label: "Total Transactions",
        value: summary ? formatNumber(summary.total_transactions) : undefined,
      },
      {
        label: "Total Volume",
        value:
          summary && `${formatNumber(summary.total_volume_sats)} sats`,
      },
      {
        label: "Avg Tx Size",
        value:
          summary &&
          `${formatNumber(Math.round(summary.average_transaction_size))} sats`,
      },
    ] : []),
    ...(showMerchantMetrics ? [
      {
        label: "Active Merchants",
        value:
          summary &&
          `${formatNumber(summary.active_merchants)}/${formatNumber(summary.total_merchants)}`,
      },
      {
        label: "Unique Products",
        value: summary ? formatNumber(summary.unique_products) : undefined,
      },
    ] : []),
    ...(showRateMetrics ? [
      {
        label: "Transactions / min",
        value: summary && summary.transactions_per_minute.toFixed(2),
        sparkline: txSparkline,
        sparklineColor: "#EEDB5F",
      },
      {
        label: "Volume / min (sats)",
        value: summary && formatNumber(Math.round(summary.volume_per_minute)),
        sparkline: volSparkline,
        sparklineColor: "#FF58A7",
      },
    ] : []),
  ];

  return (
    <div className="kpi-grid">
      {allKpis.map((kpi) => (
        <div className="kpi-card" key={kpi.label}>
          <span className="kpi-card__label">{kpi.label}</span>
          <strong className="kpi-card__value">
            {kpi.value ?? "—"}
          </strong>
          {kpi.sparkline && kpi.sparkline.length > 1 && (
            <Sparkline
              data={kpi.sparkline}
              color={kpi.sparklineColor}
            />
          )}
        </div>
      ))}
    </div>
  );
}
