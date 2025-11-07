import { useCallback, useEffect, useRef, useState } from "react";
import { REFRESH_INTERVALS } from "../config";
import { fetchMilestoneTriggers } from "../api/client";
import type { MilestoneTrigger } from "../types";

export type CelebrationEffect = "confetti" | "spotlight" | "sats-rain";

const EFFECTS: CelebrationEffect[] = ["confetti", "spotlight", "sats-rain"];

function pickEffect(): CelebrationEffect {
  return EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
}

export function useMilestoneAlerts(
  enabled: boolean,
  onTrigger: (trigger: MilestoneTrigger, effect: CelebrationEffect) => void,
) {
  const [since, setSince] = useState(() => new Date().toISOString());
  const timerRef = useRef<number | undefined>(undefined);

  const poll = useCallback(async () => {
    try {
      const result = await fetchMilestoneTriggers(since);
      const triggers = Array.isArray(result) ? result : [];
      if (!triggers.length) return;
      const newest = triggers.reduce((latest, current) =>
        current.triggered_at > latest.triggered_at ? current : latest,
      );
      const futureOnly = triggers.filter(
        (trigger) => trigger.triggered_at > since,
      );
      if (futureOnly.length) {
        onTrigger(futureOnly[futureOnly.length - 1], pickEffect());
      }
      setSince(newest.triggered_at);
    } catch (error) {
      console.error("milestone poll failed", error);
    }
  }, [since, onTrigger]);

  useEffect(() => {
    if (!enabled) {
      window.clearInterval(timerRef.current);
      return;
    }
    poll();
    timerRef.current = window.setInterval(poll, REFRESH_INTERVALS.milestones);
    return () => window.clearInterval(timerRef.current);
  }, [enabled, poll]);
}
