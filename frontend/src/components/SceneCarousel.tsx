import type { ReactNode } from "react";
import clsx from "clsx";

export type SceneConfig = {
  id: string;
  label: string;
  render: (args: { isActive: boolean }) => ReactNode;
};

type Props = {
  scenes: SceneConfig[];
  currentSceneId: string;
  onAdvance?: () => void;
};

export function SceneCarousel({ scenes, currentSceneId, onAdvance }: Props) {
  return (
    <div className="scene-carousel" onClick={onAdvance} style={{ cursor: onAdvance ? 'pointer' : 'default' }}>
      {scenes.map((scene) => {
        const isActive = scene.id === currentSceneId;
        return (
          <section
            key={scene.id}
            className={clsx("scene", {
              "scene--active": isActive,
            })}
            aria-hidden={!isActive}
          >
            <div className="scene__label">{scene.label}</div>
            <div className="scene__body">{scene.render({ isActive })}</div>
          </section>
        );
      })}
    </div>
  );
}
