import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint } from "../utils/data";
import { formatNumber } from "../utils/format";

type Props = {
  data: TrendPoint[];
};

export function TrendsChart({ data }: Props) {
  const chartData = data.map((point) => ({
    minute: point.minute.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    txCount: point.txCount,
    volume: point.volume,
  }));
  return (
    <div className="trends-chart">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <XAxis dataKey="minute" tick={{ fill: "var(--muted)" }} />
          <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fill: "var(--muted)" }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => formatNumber(value, true)}
            tick={{ fill: "var(--muted)" }}
          />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #222" }}
            labelStyle={{ color: "#999" }}
          />
          <Line yAxisId="left" type="monotone" dataKey="txCount" stroke="#ffb347" strokeWidth={3} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#61dafb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
