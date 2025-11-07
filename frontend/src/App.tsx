import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { DashboardHeader } from "./components/DashboardHeader";
import { SceneCarousel } from "./components/SceneCarousel";
import type { SceneConfig } from "./components/SceneCarousel";
import { OverviewScene } from "./components/scenes/OverviewScene";
import { LeaderboardScene } from "./components/scenes/LeaderboardScene";
import { TrendsScene } from "./components/scenes/TrendsScene";
import { AttendeeView } from "./components/AttendeeView";
import { ProductsScene } from "./components/scenes/ProductsScene";
import { useDashboardContext } from "./context/DashboardContext";
import { useSummaryQuery, useTickerQuery } from "./hooks/useDashboardQueries";
import { useSceneRotation } from "./hooks/useSceneRotation";
import { useBtcPrice } from "./hooks/useBtcPrice";
import { buildTrendSeries, calcWindowMinutes } from "./utils/data";
import { MilestoneOverlay } from "./components/MilestoneOverlay";
import { useMilestoneAlerts } from "./hooks/useMilestoneAlerts";
import type { CelebrationEffect } from "./hooks/useMilestoneAlerts";
import { REFRESH_INTERVALS } from "./config";
import type { MilestoneTrigger } from "./types";

function getMode(): "venue" | "attendee" {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "attendee" ? "attendee" : "venue";
}

function App() {
  const { timeWindow, setTimeWindow, reducedMotion } = useDashboardContext();
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

  const isOffline =
    summaryQuery.isError ||
    (Date.now() - (summaryQuery.dataUpdatedAt ?? 0) >
      REFRESH_INTERVALS.summary * 3);

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
        id: "merchants-tx",
        label: "Merchants · Transactions",
        render: ({ isActive }: { isActive: boolean }) => (
          <LeaderboardScene
            metric="transactions"
            title="Top Merchants · Transactions"
            timeWindow={timeWindow}
            btcPriceUsd={priceQuery.data?.usd}
            isActive={isActive}
          />
        ),
      },
      {
        id: "merchants-vol",
        label: "Merchants · Volume",
        render: ({ isActive }: { isActive: boolean }) => (
          <LeaderboardScene
            metric="volume"
            title="Top Merchants · Volume"
            timeWindow={timeWindow}
            btcPriceUsd={priceQuery.data?.usd}
            isActive={isActive}
          />
        ),
      },
      {
        id: "products",
        label: "Products",
        render: ({ isActive }: { isActive: boolean }) => (
          <ProductsScene
            btcPriceUsd={priceQuery.data?.usd}
            isActive={isActive}
          />
        ),
      },
      {
        id: "trends",
        label: "Pulse Trends",
        render: () => <TrendsScene data={trendSeries} />,
      },
    ],
    [priceQuery.data?.usd, summaryQuery.data, tickerQuery.data, timeWindow, trendSeries],
  );

  return (
    <div className="app-shell">
      <DashboardHeader
        btcPriceUsd={priceQuery.data?.usd}
        priceUpdatedAt={priceQuery.data?.fetchedAt}
        timeWindow={timeWindow}
        setTimeWindow={setTimeWindow}
        lastUpdated={summaryQuery.dataUpdatedAt}
        isOffline={isOffline}
        mode={mode}
      />
      <main className="main-stage">
        {mode === "venue" ? (
          <SceneCarousel
            scenes={scenes}
            currentSceneId={rotation.currentSceneId}
          />
        ) : (
          <AttendeeView
            summary={summaryQuery.data}
            ticker={tickerQuery.data}
            btcPriceUsd={priceQuery.data?.usd}
            timeWindow={timeWindow}
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
