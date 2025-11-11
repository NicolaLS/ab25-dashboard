import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { DashboardHeader } from "./components/DashboardHeader";
import { SceneCarousel } from "./components/SceneCarousel";
import type { SceneConfig } from "./components/SceneCarousel";
import { OverviewScene } from "./components/scenes/OverviewScene";
import { AttendeeView } from "./components/AttendeeView";
import { MerchantsScene } from "./components/scenes/MerchantsScene";
import { useDashboardContext } from "./context/DashboardContext";
import { useSummaryQuery, useTickerQuery } from "./hooks/useDashboardQueries";
import { useSceneRotation } from "./hooks/useSceneRotation";
import { useBtcPrice } from "./hooks/useBtcPrice";
import { buildTrendSeries, calcWindowMinutes } from "./utils/data";
import { MilestoneOverlay } from "./components/MilestoneOverlay";
import { useMilestoneAlerts } from "./hooks/useMilestoneAlerts";
import type { CelebrationEffect } from "./hooks/useMilestoneAlerts";
import type { MilestoneTrigger } from "./types";

function getMode(): "venue" | "attendee" {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "attendee" ? "attendee" : "venue";
}

function App() {
  const { timeWindow, reducedMotion } = useDashboardContext();
  const mode = getMode();

  const summaryQuery = useSummaryQuery(true);
  const tickerQuery = useTickerQuery(true);
  const priceQuery = useBtcPrice();

  const windowMinutes = calcWindowMinutes(timeWindow);

  const trendSeries = useMemo(
    () => buildTrendSeries(tickerQuery.data ?? [], windowMinutes),
    [tickerQuery.data, windowMinutes],
  );

  const [activeTrigger, setActiveTrigger] = useState<{
    trigger: MilestoneTrigger;
    effect: CelebrationEffect;
  } | null>(null);
  const rotation = useSceneRotation(mode !== "venue" || Boolean(activeTrigger));

  useMilestoneAlerts(mode === "venue", (trigger, effect) => {
    setActiveTrigger({ trigger, effect });
  });

  useEffect(() => {
    if (!activeTrigger) return;
    const timer = window.setTimeout(
      () => setActiveTrigger(null),
      reducedMotion ? 3000 : 6000,
    );
    return () => window.clearTimeout(timer);
  }, [activeTrigger, reducedMotion]);

  const scenes: SceneConfig[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        render: () => (
          <OverviewScene
            summary={summaryQuery.data}
            ticker={tickerQuery.data}
            btcPriceUsd={priceQuery.data?.usd}
            trendSeries={trendSeries}
          />
        ),
      },
      {
        id: "merchants",
        label: "Merchants",
        render: ({ isActive }: { isActive: boolean }) => (
          <MerchantsScene
            timeWindow={timeWindow}
            btcPriceUsd={priceQuery.data?.usd}
            isActive={isActive}
          />
        ),
      },
    ],
    [priceQuery.data?.usd, summaryQuery.data, tickerQuery.data, timeWindow, trendSeries],
  );

  return (
    <div className="app-shell">
      <DashboardHeader
        btcPriceUsd={priceQuery.data?.usd}
        mode={mode}
      />
      <main className="main-stage">
        {mode === "venue" ? (
          <SceneCarousel
            scenes={scenes}
            currentSceneId={rotation.currentSceneId}
            onAdvance={rotation.skip}
          />
        ) : (
          <AttendeeView
            summary={summaryQuery.data}
            ticker={tickerQuery.data}
            btcPriceUsd={priceQuery.data?.usd}
          />
        )}
      </main>
      <MilestoneOverlay
        trigger={activeTrigger?.trigger}
        effect={activeTrigger?.effect}
        reducedMotion={reducedMotion}
        onDismiss={() => setActiveTrigger(null)}
      />
    </div>
  );
}

export default App;
