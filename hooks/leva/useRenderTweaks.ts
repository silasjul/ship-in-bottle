import { useEffect } from 'react';
import { useControls } from 'leva';
import { RENDER_DEFAULTS } from '@/configs/renderConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useRenderTweaks() {
  const setConfig = useLevaStore((s) => s.setRender);

  const { exposure, envIntensity } = useControls(
    'Render',
    {
      exposure: {
        value: RENDER_DEFAULTS.exposure,
        min: 0.1,
        max: 5,
        step: 0.05,
      },
      envIntensity: {
        value: RENDER_DEFAULTS.envIntensity,
        min: 0,
        max: 3,
        step: 0.05,
        label: 'env intensity',
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ exposure, envIntensity });
  }, [setConfig, exposure, envIntensity]);
}
