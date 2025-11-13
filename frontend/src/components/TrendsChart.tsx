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
  height?: number;
};

export function TrendsChart({ data }: Props) {
  const chartData = data.map((point) => ({
    minute: point.minute.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    txCount: point.txCount,
    volume: point.volume,
  }));
  return (
    <div className="trends-chart" style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <XAxis dataKey="minute" tick={{ fill: "var(--muted)" }} stroke="#0400FF" />
          <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fill: "var(--muted)" }} stroke="#0400FF" />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => formatNumber(value, true)}
            tick={{ fill: "var(--muted)" }}
            stroke="#0400FF"
          />
          <Tooltip
            contentStyle={{ background: "#0a0a28", border: "1px solid #FF58A7" }}
            labelStyle={{ color: "#8a8fa0" }}
          />
          <Line yAxisId="left" type="monotone" dataKey="txCount" stroke="#EEDB5F" strokeWidth={3} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#FF58A7" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
