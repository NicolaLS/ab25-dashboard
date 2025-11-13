import { useQuery } from "@tanstack/react-query";
import { fetchSummary } from "../../api/client";
import { formatSats } from "../../utils/format";
import "./SystemInfoPanel.css";

export function SystemInfoPanel() {
  const summaryQuery = useQuery({
    queryKey: ["summary"],
    queryFn: fetchSummary,
    refetchInterval: 10000,
  });

  const summary = summaryQuery.data;

  // Environment/config info (these would be known from frontend env vars or could be added to an API endpoint)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2>System Information</h2>
      </div>

      <div className="panel-body">
        <div className="info-section">
          <h3>API Configuration</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Backend URL</span>
              <code className="info-value">{apiBaseUrl}</code>
            </div>
            <div className="info-item">
              <span className="info-label">API Version</span>
              <code className="info-value">v1</code>
            </div>
            <div className="info-item">
              <span className="info-label">Connection Status</span>
              <span className={`info-value status ${summaryQuery.isSuccess ? "connected" : "disconnected"}`}>
                {summaryQuery.isSuccess ? "✓ Connected" : "✗ Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {summary && (
          <>
            <div className="info-section">
              <h3>Dashboard Stats</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Total Transactions</span>
                  <span className="info-value highlight">{summary.total_transactions.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Total Volume</span>
                  <span className="info-value highlight">{formatSats(summary.total_volume_sats)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Average TX Size</span>
                  <span className="info-value">{formatSats(Math.round(summary.average_transaction_size))}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Active Merchants</span>
                  <span className="info-value">
                    {summary.active_merchants} / {summary.total_merchants}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Unique Products</span>
                  <span className="info-value">{summary.unique_products.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">TX per Minute</span>
                  <span className="info-value">{summary.transactions_per_minute.toFixed(2)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Volume per Minute</span>
                  <span className="info-value">{formatSats(Math.round(summary.volume_per_minute))}</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="info-section">
          <h3>Frontend Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Build Date</span>
              <code className="info-value">{new Date().toLocaleDateString()}</code>
            </div>
            <div className="info-item">
              <span className="info-label">Browser</span>
              <code className="info-value">{navigator.userAgent.split(" ").pop()}</code>
            </div>
            <div className="info-item">
              <span className="info-label">Timezone</span>
              <code className="info-value">{Intl.DateTimeFormat().resolvedOptions().timeZone}</code>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3>Quick Links</h3>
          <div className="quick-links">
            <a href="/" className="quick-link" target="_blank" rel="noopener noreferrer">
              Dashboard (Venue Mode)
            </a>
            <a href="/?mode=attendee" className="quick-link" target="_blank" rel="noopener noreferrer">
              Dashboard (Attendee Mode)
            </a>
            <a href={`${apiBaseUrl}/v1/health`} className="quick-link" target="_blank" rel="noopener noreferrer">
              API Health Check
            </a>
            <a href={`${apiBaseUrl}/v1/summary`} className="quick-link" target="_blank" rel="noopener noreferrer">
              API Summary Endpoint
            </a>
          </div>
        </div>

        <div className="info-section">
          <h3>Configuration Notes</h3>
          <div className="config-notes">
            <div className="note">
              <strong>Backend Environment Variables:</strong>
              <ul>
                <li>
                  <code>ADMIN_TOKEN</code> - Required for admin authentication (not displayed for security)
                </li>
                <li>
                  <code>DB_PATH</code> - SQLite database file path (default: dashboard.db)
                </li>
                <li>
                  <code>POLL_INTERVAL</code> - How often to poll merchants (default: 30s)
                </li>
                <li>
                  <code>POLL_CONCURRENCY</code> - Number of concurrent polling workers (default: 5)
                </li>
                <li>
                  <code>SOURCE_BASE_URL</code> - PayWithFlash API base URL
                </li>
                <li>
                  <code>CORS_ORIGINS</code> - Allowed CORS origins (default: *)
                </li>
              </ul>
            </div>
            <div className="note">
              <strong>Frontend Environment Variables:</strong>
              <ul>
                <li>
                  <code>VITE_API_BASE_URL</code> - Override backend URL (optional, defaults to same origin)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
