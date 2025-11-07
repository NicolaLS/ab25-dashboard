import { useQuery } from "@tanstack/react-query";
import { REFRESH_INTERVALS } from "../config";
import { fetchBtcPrice } from "../api/price";

export function useBtcPrice() {
  const query = useQuery({
    queryKey: ["btc-price"],
    queryFn: fetchBtcPrice,
    refetchInterval: REFRESH_INTERVALS.price,
    staleTime: REFRESH_INTERVALS.price,
  });
  return query;
}
