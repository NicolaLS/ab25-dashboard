import { QRCodeSVG } from "qrcode.react";
import type { Summary, WifiConfig } from "../../types";
import { formatNumber, formatSats, satsToUsd, formatCurrency } from "../../utils/format";

type Props = {
  summary?: Summary;
  config?: WifiConfig;
  btcPriceUsd?: number;
};

export function WifiScene({ summary, config, btcPriceUsd }: Props) {
  const usdValue = summary && btcPriceUsd ? satsToUsd(summary.total_volume_sats, btcPriceUsd) : 0;

  return (
    <div className="wifi-scene">
      <div className="wifi-scene__header">
        <h2 className="wifi-scene__title">WiFi Upgrades</h2>
      </div>

      <div className="wifi-scene__content">
        <div className="wifi-scene__metrics">
          <div className="kpi-card kpi-card--large">
            <span className="kpi-card__label">Total Upgrades</span>
            <strong className="kpi-card__value">
              {summary ? formatNumber(summary.total_transactions) : "—"}
            </strong>
          </div>

          <div className="kpi-card kpi-card--large">
            <span className="kpi-card__label">Total Revenue</span>
            <strong className="kpi-card__value">
              {summary ? (
                <>
                  {formatSats(summary.total_volume_sats)}
                  {usdValue > 0 && (
                    <small style={{ display: 'block', fontSize: '0.5em', color: 'var(--muted)', marginTop: '0.5rem' }}>
                      {formatCurrency(usdValue)}
                    </small>
                  )}
                </>
              ) : "—"}
            </strong>
          </div>
        </div>

        <div className="wifi-scene__qr-section">
          {config?.lightning_address ? (
            <div className="wifi-scene__qr-container">
              <div className="wifi-scene__qr-wrapper">
                <QRCodeSVG
                  value={`lightning:${config.lightning_address}`}
                  size={280}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <div className="wifi-scene__lightning-address">
                {config.lightning_address}
              </div>
            </div>
          ) : (
            <div className="wifi-scene__qr-placeholder">
              <p>Lightning address not configured</p>
            </div>
          )}

          <div className="wifi-scene__description">
            <p className="wifi-scene__description-text">
              {config?.description || "Upgrade your WiFi connection"}
            </p>
            {config?.price_sats && config?.duration_hours && (
              <p className="wifi-scene__details">
                {config.duration_hours} hours for {formatNumber(parseInt(config.price_sats))} satoshis
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
