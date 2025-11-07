import type { TickerEntry } from "../types";
import { formatNumber, formatTime, satsToUsd, formatCurrency } from "../utils/format";

type Props = {
  entries?: TickerEntry[];
  btcPriceUsd?: number;
};

export function Ticker({ entries = [], btcPriceUsd }: Props) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  return (
    <div className="ticker">
      <div className="ticker__title">Live Ticker</div>
      <div className="ticker__list">
        {safeEntries.slice(0, 12).map((entry) => {
          const usd = satsToUsd(entry.amount_sats, btcPriceUsd ?? 0);
          return (
            <div className="ticker__row" key={entry.sale_id}>
              <div>
                <div className="ticker__alias">{entry.merchant_alias}</div>
                <div className="ticker__time">
                  {formatTime(new Date(entry.sale_date))}
                </div>
              </div>
              <div className="ticker__amount">
                <span>{formatNumber(entry.amount_sats)} sats</span>
                {usd > 0 && <small>{formatCurrency(usd)}</small>}
              </div>
            </div>
          );
        })}
        {!safeEntries.length && (
          <div className="ticker__placeholder">Waiting for transactions…</div>
        )}
      </div>
    </div>
  );
}
