import { PRICE_API_URL } from "../config";

export type PriceResponse = {
  bitcoin: {
    usd: number;
  };
};

export async function fetchBtcPrice() {
  const response = await fetch(PRICE_API_URL);
  if (!response.ok) {
    throw new Error("Failed to load BTC price");
  }
  const data = (await response.json()) as PriceResponse;
  return {
    usd: data.bitcoin?.usd ?? 0,
    fetchedAt: Date.now(),
  };
}
