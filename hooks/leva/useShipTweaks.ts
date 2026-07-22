import { useEffect } from 'react';
import { folder, useControls } from 'leva';
import { SHIP_DEFAULTS } from '@/configs/shipConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useShipTweaks() {
  const setConfig = useLevaStore((s) => s.setShip);

  const values = useControls(
    'Ship',
    {
      position: { value: SHIP_DEFAULTS.position, step: 0.1 },
      rotation: { value: SHIP_DEFAULTS.rotation, step: 1 },
      scale: { value: SHIP_DEFAULTS.scale, min: 0.1, max: 3, step: 0.05 },
      buoyancy: SHIP_DEFAULTS.buoyancy,

      'Wake capsule': folder(
        {
          showWake: { value: SHIP_DEFAULTS.showWake, label: 'show wireframe' },
          wakeLength: { value: SHIP_DEFAULTS.wakeLength, min: 0.2, max: 4, step: 0.01, label: 'length' },
          wakeRadius: { value: SHIP_DEFAULTS.wakeRadius, min: 0.05, max: 1.5, step: 0.01, label: 'radius' },
          wakeYOffset: { value: SHIP_DEFAULTS.wakeYOffset, min: -1, max: 1, step: 0.01, label: 'y offset' },
          wakeYaw: { value: SHIP_DEFAULTS.wakeYaw, min: -180, max: 180, step: 1, label: 'rotation' },
        },
        { collapsed: true }
      ),
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig(values);
  }, [setConfig, values]);
}
