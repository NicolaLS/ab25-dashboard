import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import {
  DEFAULT_TIME_WINDOW,
  SCENE_ORDER,
  type TimeWindowValue,
} from "../config";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

type DashboardContextValue = {
  timeWindow: TimeWindowValue;
  setTimeWindow: (window: TimeWindowValue) => void;
  reducedMotion: boolean;
  scenes: typeof SCENE_ORDER;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined,
);

export function DashboardProvider({ children }: PropsWithChildren) {
  const [timeWindow, setTimeWindow] = useState(DEFAULT_TIME_WINDOW);
  const reducedMotion = usePrefersReducedMotion();

  const value = useMemo(
    () => ({
      timeWindow,
      setTimeWindow,
      reducedMotion,
      scenes: SCENE_ORDER,
    }),
    [timeWindow, reducedMotion],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used inside DashboardProvider");
  }
  return ctx;
}
