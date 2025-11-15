import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { DashboardHeader } from "./components/DashboardHeader";
import { SceneCarousel } from "./components/SceneCarousel";
import type { SceneConfig } from "./components/SceneCarousel";
import { OverviewScene } from "./components/scenes/OverviewScene";
import { AttendeeView } from "./components/AttendeeView";
import { MerchantsScene } from "./components/scenes/MerchantsScene";
import { WifiScene } from "./components/scenes/WifiScene";
import { MerchScene } from "./components/scenes/MerchScene";
import { useDashboardContext } from "./context/DashboardContext";
import { useSummaryQuery, useTickerQuery, useWifiConfigQuery, useWifiSummaryQuery, useScenesQuery } from "./hooks/useDashboardQueries";
import { useSceneRotation } from "./hooks/useSceneRotation";
import { useBtcPrice } from "./hooks/useBtcPrice";
import { buildTrendSeries, calcWindowMinutes } from "./utils/data";
import { MilestoneOverlay } from "./components/MilestoneOverlay";
import { useMilestoneAlerts } from "./hooks/useMilestoneAlerts";
import type { CelebrationEffect } from "./hooks/useMilestoneAlerts";
import type { MilestoneTrigger } from "./types";
import { useAdmin } from "./context/AdminContext";
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminDashboard } from "./components/admin/AdminDashboard";

function getMode(): "venue" | "attendee" | "admin" {
  const params = new URLSearchParams(window.location.search);
  if (params.get("admin") === "true") return "admin";
  return params.get("mode") === "attendee" ? "attendee" : "venue";
}

function App() {
  const { timeWindow, reducedMotion } = useDashboardContext();
  const { isAuthenticated } = useAdmin();
  const mode = getMode();

  // If admin mode is requested, show admin interface
  if (mode === "admin") {
    if (!isAuthenticated) {
      return <AdminLogin />;
    }
    return <AdminDashboard />;
  }

  // Regular dashboard mode
  const summaryQuery = useSummaryQuery(true);
  const tickerQuery = useTickerQuery(true);
  const priceQuery = useBtcPrice();
  const wifiConfigQuery = useWifiConfigQuery();
  const wifiSummaryQuery = useWifiSummaryQuery(mode === "venue");
  const scenesQuery = useScenesQuery();

  const windowMinutes = calcWindowMinutes(timeWindow);

  const trendSeries = useMemo(
    () => buildTrendSeries(tickerQuery.data ?? [], windowMinutes),
    [tickerQuery.data, windowMinutes],
  );

  const [activeTrigger, setActiveTrigger] = useState<{
    trigger: MilestoneTrigger;
    effect: CelebrationEffect;
  } | null>(null);

  // Build scene rotation config from API data
  const sceneRotationConfig = useMemo(() => {
    if (!scenesQuery.data) return [];
    return scenesQuery.data
      .filter(scene => scene.enabled)
      .sort((a, b) => a.order - b.order)
      .map(scene => ({ id: scene.id, duration: scene.duration }));
  }, [scenesQuery.data]);

  const rotation = useSceneRotation(
    mode !== "venue" || Boolean(activeTrigger),
    sceneRotationConfig
  );

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

  // Map of scene IDs to their render functions
  const sceneComponents: Record<string, SceneConfig> = useMemo(
    () => ({
      overview: {
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
      merchants: {
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
      wifi: {
        id: "wifi",
        label: "WiFi Upgrades",
        render: () => (
          <WifiScene
            summary={wifiSummaryQuery.data}
            config={wifiConfigQuery.data}
            btcPriceUsd={priceQuery.data?.usd}
          />
        ),
      },
      merch: {
        id: "merch",
        label: "Merch",
        render: () => <MerchScene />,
      },
    }),
    [priceQuery.data?.usd, summaryQuery.data, tickerQuery.data, timeWindow, trendSeries, wifiSummaryQuery.data, wifiConfigQuery.data],
  );

  // Build scenes array from API response
  const scenes: SceneConfig[] = useMemo(() => {
    if (!scenesQuery.data) {
      // Fallback to default scenes if API hasn't loaded yet
      return Object.values(sceneComponents);
    }
    // Filter and order scenes based on API response
    return scenesQuery.data
      .filter(scene => scene.enabled && sceneComponents[scene.id])
      .sort((a, b) => a.order - b.order)
      .map(scene => sceneComponents[scene.id]);
  }, [scenesQuery.data, sceneComponents]);

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
