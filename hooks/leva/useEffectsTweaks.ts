import { useEffect } from 'react';
import { useControls } from 'leva';
import { EFFECTS_DEFAULTS } from '@/configs/effectsConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useEffectsTweaks() {
  const setConfig = useLevaStore((s) => s.setEffects);

  const values = useControls(
    'Effects',
    {
      enabled: { value: EFFECTS_DEFAULTS.enabled, label: 'post fx' },
      bloom: { value: EFFECTS_DEFAULTS.bloom, min: 0, max: 3, step: 0.05 },
      bloomThreshold: { value: EFFECTS_DEFAULTS.bloomThreshold, min: 0, max: 1.5, step: 0.01, label: 'bloom cutoff' },
      vignette: { value: EFFECTS_DEFAULTS.vignette, min: 0, max: 1, step: 0.01 },
      vignetteOffset: { value: EFFECTS_DEFAULTS.vignetteOffset, min: 0, max: 1, step: 0.01, label: 'vignette size' },
      grain: { value: EFFECTS_DEFAULTS.grain, min: 0, max: 0.4, step: 0.005 },
      fringe: { value: EFFECTS_DEFAULTS.fringe, min: 0, max: 0.005, step: 0.0001 },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig(values);
  }, [setConfig, values]);
}
