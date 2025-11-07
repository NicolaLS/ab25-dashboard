import { useEffect, useState } from "react";
import { SCENE_ORDER } from "../config";

export function useSceneRotation(paused: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused) return;
    const scene = SCENE_ORDER[index % SCENE_ORDER.length];
    const timer = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % SCENE_ORDER.length);
    }, scene.duration);
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  const skip = () => setIndex((prev) => (prev + 1) % SCENE_ORDER.length);

  return {
    currentSceneId: SCENE_ORDER[index % SCENE_ORDER.length].id,
    index,
    skip,
  };
}
