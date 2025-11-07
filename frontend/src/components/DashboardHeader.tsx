import { useMemo } from "react";
import { formatCurrency, formatTime } from "../utils/format";
import { useNow } from "../hooks/useNow";
import { TIME_WINDOW_OPTIONS, type TimeWindowValue } from "../config";

type Props = {
  btcPriceUsd?: number;
  priceUpdatedAt?: number;
  timeWindow: TimeWindowValue;
  setTimeWindow: (window: TimeWindowValue) => void;
  lastUpdated?: number;
  isOffline: boolean;
  mode: "venue" | "attendee";
};

export function DashboardHeader({
  btcPriceUsd,
  priceUpdatedAt,
  timeWindow,
  setTimeWindow,
  lastUpdated,
  isOffline,
  mode,
}: Props) {
  const now = useNow();
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return "—";
    return formatTime(new Date(lastUpdated));
  }, [lastUpdated]);

  const priceDisplay = btcPriceUsd
    ? formatCurrency(btcPriceUsd, 0)
    : "Loading...";

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__badge">{mode === "venue" ? "Live" : "Attendee"}</span>
        <h1>Adopting Bitcoin · POS Pulse</h1>
      </div>
      <div className="header__controls">
        <div className="header__price">
          <span>BTC/USD</span>
          <strong>{priceDisplay}</strong>
          {priceUpdatedAt && (
            <small>Updated {formatTime(new Date(priceUpdatedAt))}</small>
          )}
        </div>
        <div className="header__window">
          <label htmlFor="window-select">Window</label>
          <select
            id="window-select"
            value={timeWindow}
            onChange={(event) => setTimeWindow(event.target.value as TimeWindowValue)}
          >
            {TIME_WINDOW_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="header__clock">
          <span>{now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
          <strong>{formatTime(now)}</strong>
        </div>
        <div className="header__status">
          <span className={isOffline ? "status status--error" : "status status--ok"}>
            {isOffline ? "Stale" : "Live"}
          </span>
          <small>Last update {lastUpdatedText}</small>
        </div>
      </div>
    </header>
  );
}
