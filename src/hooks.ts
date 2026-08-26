import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchOrders,
  fetchPerformance,
  fetchPositions,
  fetchSchwabPerformance,
  fetchSchwabPositions,
  fetchStatus,
} from "./api";
import { matchesAssetFilter, performanceForFilter } from "./desk";
import { useSession } from "./session";

export function useDeskQueries() {
  const { mode, assetFilter, ready, needsLogin } = useSession();
  const enabled = ready && !needsLogin;

  const statusQ = useQuery({
    queryKey: ["status", mode],
    queryFn: fetchStatus,
    enabled,
    refetchInterval: (q) =>
      q.state.data?.job?.status === "running" ? 1500 : 15_000,
  });

  const ordersQ = useQuery({
    queryKey: ["orders", mode],
    queryFn: fetchOrders,
    enabled,
    refetchInterval: 30_000,
  });

  const positionsQ = useQuery({
    queryKey: ["positions", mode],
    queryFn: fetchPositions,
    enabled,
    refetchInterval: 30_000,
  });

  const perfQ = useQuery({
    queryKey: ["performance", mode],
    queryFn: fetchPerformance,
    enabled,
    refetchInterval: 60_000,
  });

  const schwabPositionsQ = useQuery({
    queryKey: ["schwab-positions"],
    queryFn: fetchSchwabPositions,
    enabled,
    refetchInterval: 30_000,
  });

  const schwabPerfQ = useQuery({
    queryKey: ["schwab-performance"],
    queryFn: fetchSchwabPerformance,
    enabled,
    refetchInterval: 60_000,
  });

  const filteredPerformance = useMemo(
    () => (perfQ.data ? performanceForFilter(perfQ.data, assetFilter) : undefined),
    [perfQ.data, assetFilter]
  );
  const filteredSchwabPerformance = useMemo(
    () =>
      schwabPerfQ.data
        ? performanceForFilter(schwabPerfQ.data, assetFilter)
        : undefined,
    [schwabPerfQ.data, assetFilter]
  );
  const filteredOrders =
    ordersQ.data?.orders.filter((o) =>
      matchesAssetFilter(o.symbol, assetFilter)
    ) ?? [];

  return {
    statusQ,
    ordersQ,
    positionsQ,
    perfQ,
    schwabPositionsQ,
    schwabPerfQ,
    assetFilter,
    filteredPerformance,
    filteredSchwabPerformance,
    filteredOrders,
  };
}

export function useInvalidateDesk() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["status"] });
    void qc.invalidateQueries({ queryKey: ["orders"] });
    void qc.invalidateQueries({ queryKey: ["positions"] });
    void qc.invalidateQueries({ queryKey: ["performance"] });
    void qc.invalidateQueries({ queryKey: ["schwab-positions"] });
    void qc.invalidateQueries({ queryKey: ["schwab-performance"] });
  };
}
