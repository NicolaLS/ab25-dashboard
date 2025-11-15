import { useEffect, useState } from "react";

type SceneRotationConfig = {
  id: string;
  duration: number;
};

export function useSceneRotation(
  paused: boolean,
  sceneConfigs: SceneRotationConfig[]
) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || sceneConfigs.length === 0) return;
    const scene = sceneConfigs[index % sceneConfigs.length];
    const timer = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % sceneConfigs.length);
    }, scene.duration);
    return () => window.clearTimeout(timer);
  }, [index, paused, sceneConfigs]);

  const skip = () =>
    setIndex((prev) => (prev + 1) % (sceneConfigs.length || 1));

  return {
    currentSceneId:
      sceneConfigs.length > 0
        ? sceneConfigs[index % sceneConfigs.length].id
        : "",
    index,
    skip,
  };
}
