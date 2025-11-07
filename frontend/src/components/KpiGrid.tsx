import type { Summary } from "../types";
import { formatCurrency, formatNumber, satsToUsd } from "../utils/format";
import { Sparkline } from "./Sparkline";
import type { TrendPoint } from "../utils/data";

type Props = {
  summary?: Summary;
  btcPriceUsd?: number;
  trendSeries?: TrendPoint[];
};

export function KpiGrid({ summary, btcPriceUsd, trendSeries = [] }: Props) {
  const txSparkline = trendSeries.map((point) => point.txCount);
  const volSparkline = trendSeries.map((point) => point.volume);

  const volumeUsd = summary
    ? satsToUsd(summary.total_volume_sats, btcPriceUsd ?? 0)
    : 0;

  const kpis = [
    {
      label: "Total Transactions",
      value: summary ? formatNumber(summary.total_transactions) : undefined,
    },
    {
      label: "Total Volume",
      value:
        summary && `${formatNumber(summary.total_volume_sats)} sats · ${
          volumeUsd ? formatCurrency(volumeUsd) : "—"
        }`,
    },
    {
      label: "Avg Tx Size",
      value:
        summary &&
        `${formatNumber(Math.round(summary.average_transaction_size))} sats`,
    },
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
    {
      label: "Transactions / min",
      value: summary && summary.transactions_per_minute.toFixed(2),
      sparkline: txSparkline,
    },
    {
      label: "Volume / min (sats)",
      value: summary && formatNumber(Math.round(summary.volume_per_minute)),
      sparkline: volSparkline,
    },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map((kpi) => (
        <div className="kpi-card" key={kpi.label}>
          <span className="kpi-card__label">{kpi.label}</span>
          <strong className="kpi-card__value">
            {kpi.value ?? "—"}
          </strong>
          {kpi.sparkline && kpi.sparkline.length > 1 && (
            <Sparkline data={kpi.sparkline} />
          )}
        </div>
      ))}
    </div>
  );
}
