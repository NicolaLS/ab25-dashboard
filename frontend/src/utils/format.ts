const intlNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const intlCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNumber(value: number, compact = false) {
  if (Number.isNaN(value) || value === undefined || value === null) {
    return "–";
  }
  if (compact) {
    return intlCompact.format(value);
  }
  return intlNumber.format(value);
}

export function formatCurrency(value: number, minimumFractionDigits = 0) {
  if (!Number.isFinite(value)) return "–";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.max(minimumFractionDigits, value >= 1000 ? 0 : 2),
    minimumFractionDigits,
  }).format(value);
}

export function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function satsToUsd(amountSats: number, priceUsd: number) {
  if (!priceUsd) return 0;
  return (amountSats / 1e8) * priceUsd;
}

export function formatSats(amountSats: number, compact = false) {
  if (Number.isNaN(amountSats) || amountSats === undefined || amountSats === null) {
    return "–";
  }
  const formatted = compact ? intlCompact.format(amountSats) : intlNumber.format(amountSats);
  return `${formatted} sats`;
}
