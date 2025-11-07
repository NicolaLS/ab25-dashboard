import type { TrendPoint } from "../../utils/data";
import { TrendsChart } from "../TrendsChart";

type Props = {
  data: TrendPoint[];
};

export function TrendsScene({ data }: Props) {
  return (
    <div className="trends-scene">
      <div className="trends-scene__meta">
        <h3>Pulse</h3>
        <p>Transactions per minute vs sats per minute</p>
      </div>
      <TrendsChart data={data} />
    </div>
  );
}
