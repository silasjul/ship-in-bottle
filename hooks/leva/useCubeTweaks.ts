import { useEffect } from 'react';
import { useControls } from 'leva';
import { CUBE_DEFAULTS } from '@/configs/cubeConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useCubeTweaks() {
  const setConfig = useLevaStore((s) => s.setCube);

  const { color, rotationSpeed, scale, wireframe } = useControls(
    'Cube',
    {
      color: CUBE_DEFAULTS.color,
      rotationSpeed: {
        value: CUBE_DEFAULTS.rotationSpeed,
        min: 0,
        max: 5,
        step: 0.1,
        label: 'rotation speed',
      },
      scale: { value: CUBE_DEFAULTS.scale, min: 0.1, max: 3, step: 0.1 },
      wireframe: CUBE_DEFAULTS.wireframe,
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ color, rotationSpeed, scale, wireframe });
  }, [setConfig, color, rotationSpeed, scale, wireframe]);
}
