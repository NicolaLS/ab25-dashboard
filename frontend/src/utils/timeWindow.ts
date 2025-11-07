const WINDOW_LABELS: Record<string, string> = {
  "5m": "5 minutes",
  "30m": "30 minutes",
  "60m": "60 minutes",
  all: "All time",
};

export function formatWindowLabel(window: string) {
  return WINDOW_LABELS[window] ?? window;
}
