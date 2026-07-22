import { useEffect } from 'react';
import { folder, useControls } from 'leva';
import { BOTTLE_DEFAULTS } from '@/configs/bottleConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useBottleTweaks() {
  const setConfig = useLevaStore((s) => s.setBottle);

  const values = useControls(
    'Bottle',
    {
      position: { value: BOTTLE_DEFAULTS.position, step: 0.05 },
      scale: { value: BOTTLE_DEFAULTS.scale, min: 0.02, max: 2, step: 0.005 },

      Model: folder(
        {
          modelPosition: {
            value: BOTTLE_DEFAULTS.model.position,
            step: 0.1,
            label: 'position',
          },
          modelRotation: {
            value: BOTTLE_DEFAULTS.model.rotation,
            min: -180,
            max: 180,
            step: 1,
            label: 'rotation',
          },
          modelScale: {
            value: BOTTLE_DEFAULTS.model.scale,
            min: 0.01,
            max: 10,
            step: 0.01,
            label: 'scale',
          },
        },
        { collapsed: false }
      ),
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({
      position: values.position,
      scale: values.scale,
      model: {
        position: values.modelPosition,
        rotation: values.modelRotation,
        scale: values.modelScale,
      },
    });
  }, [setConfig, values]);
}
