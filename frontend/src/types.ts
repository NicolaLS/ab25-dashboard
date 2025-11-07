export type Summary = {
  total_transactions: number;
  total_volume_sats: number;
  average_transaction_size: number;
  active_merchants: number;
  total_merchants: number;
  unique_products: number;
  transactions_per_minute: number;
  volume_per_minute: number;
};

export type TickerEntry = {
  sale_id: number;
  merchant_id: string;
  merchant_alias: string;
  amount_sats: number;
  sale_date: string;
};

export type MerchantLeaderboardRow = {
  merchant_id: string;
  alias: string;
  transactions: number;
  volume_sats: number;
};

export type ProductLeaderboardRow = {
  merchant_id: string;
  product_id: number;
  name: string;
  transactions: number;
  volume_sats: number;
};

export type MilestoneTrigger = {
  id: number;
  milestone_id: number;
  name: string;
  type: string;
  threshold: number;
  triggered_at: string;
  total_transactions: number;
  total_volume_sats: number;
};

export type LeaderboardMetric = "transactions" | "volume";
