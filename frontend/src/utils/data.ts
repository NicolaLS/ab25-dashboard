import { parseISO } from "date-fns";
import type { TickerEntry } from "../types";

export type TrendPoint = {
  minute: Date;
  txCount: number;
  volume: number;
};

export function buildTrendSeries(
  ticker: TickerEntry[],
  windowMinutes: number,
): TrendPoint[] {
  if (!ticker.length) return [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const buckets = new Map<string, TrendPoint>();

  ticker.forEach((entry) => {
    const date = parseISO(entry.sale_date);
    if (date < cutoff) return;
    const minuteKey = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const existing = buckets.get(minuteKey);
    if (existing) {
      existing.txCount += 1;
      existing.volume += entry.amount_sats;
    } else {
      buckets.set(minuteKey, {
        minute: new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
          ),
        ),
        txCount: 1,
        volume: entry.amount_sats,
      });
    }
  });

  const sorted = Array.from(buckets.values()).sort(
    (a, b) => a.minute.getTime() - b.minute.getTime(),
  );
  return sorted;
}

export function calcWindowMinutes(window: string) {
  if (window === "all") {
    return 24 * 60;
  }
  const match = window.match(/(\d+)([mh])/i);
  if (!match) return 60;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "h") return value * 60;
  return value;
}

export function newestTickerDate(ticker: TickerEntry[]) {
  if (!ticker.length) return null;
  return ticker
    .map((entry) => parseISO(entry.sale_date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
}
