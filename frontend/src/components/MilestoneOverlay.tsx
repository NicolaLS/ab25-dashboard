import clsx from "clsx";
import type { MilestoneTrigger } from "../types";
import type { CelebrationEffect } from "../hooks/useMilestoneAlerts";
import { formatNumber, formatTime } from "../utils/format";

type Props = {
  trigger?: MilestoneTrigger;
  effect?: CelebrationEffect;
  reducedMotion: boolean;
  onDismiss: () => void;
};

export function MilestoneOverlay({
  trigger,
  effect = "confetti",
  reducedMotion,
  onDismiss,
}: Props) {
  if (!trigger) return null;
  const title =
    trigger.type === "volume"
      ? `${formatNumber(trigger.total_volume_sats)} sats processed!`
      : `${formatNumber(trigger.total_transactions)} transactions!`;

  return (
    <div
      className={clsx("milestone-overlay", {
        "milestone-overlay--visible": true,
        [`milestone-overlay--${effect}`]: !reducedMotion,
      })}
      role="alert"
      onClick={onDismiss}
    >
      <div className="milestone-overlay__content">
        <p className="milestone-overlay__eyebrow">Milestone unlocked</p>
        <h2>{trigger.name}</h2>
        <p>{title}</p>
        <small>{formatTime(new Date(trigger.triggered_at))}</small>
        <button type="button">Continue</button>
      </div>
    </div>
  );
}
