import { formatCurrency, formatTime } from "../utils/format";
import { useNow } from "../hooks/useNow";
import AbLogo from "../assets/ab-logo.svg";
import FlashLogo from "../assets/flash-logo.png";

type Props = {
  btcPriceUsd?: number;
  mode: "venue" | "attendee";
};

export function DashboardHeader({
  btcPriceUsd,
  mode,
}: Props) {
  const now = useNow();

  const priceDisplay = btcPriceUsd
    ? formatCurrency(btcPriceUsd, 0)
    : "Loading...";

  return (
    <header className="header">
      <div className="header__brand">
        <img src={AbLogo} alt="Adopting Bitcoin" className="header__brand-logo" />
        <h1>Adopting Bitcoin · Pulse</h1>
        <span className="header__badge">{mode === "venue" ? "Live" : "Attendee"}</span>
      </div>
      <div className="header__controls">
        <div className="header__powered">
          <span>Powered by</span>
          <img src={FlashLogo} alt="Pay with Flash" />
        </div>
        <div className="header__price">
          <span>BTC/USD</span>
          <strong>{priceDisplay}</strong>
        </div>
        <div className="header__clock">
          <span>{now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
          <strong>{formatTime(now)}</strong>
        </div>
      </div>
    </header>
  );
}
