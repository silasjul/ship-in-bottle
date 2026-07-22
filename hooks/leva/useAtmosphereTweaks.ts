import { useEffect } from 'react';
import { folder, useControls } from 'leva';
import { ATMOSPHERE_DEFAULTS } from '@/configs/atmosphereConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useAtmosphereTweaks() {
  const setConfig = useLevaStore((s) => s.setAtmosphere);

  const values = useControls(
    'Atmosphere',
    {
      colorTop: { value: ATMOSPHERE_DEFAULTS.colorTop, label: 'sky top' },
      colorBottom: { value: ATMOSPHERE_DEFAULTS.colorBottom, label: 'sky bottom' },
      glowColor: { value: ATMOSPHERE_DEFAULTS.glowColor, label: 'glow' },
      glowIntensity: { value: ATMOSPHERE_DEFAULTS.glowIntensity, min: 0, max: 3, step: 0.05, label: 'glow strength' },
      glowSize: { value: ATMOSPHERE_DEFAULTS.glowSize, min: 0.05, max: 1, step: 0.01, label: 'glow size' },
      haze: { value: ATMOSPHERE_DEFAULTS.haze, min: 0, max: 1, step: 0.01 },
      drift: { value: ATMOSPHERE_DEFAULTS.drift, min: 0, max: 1, step: 0.01, label: 'haze drift' },
      rays: { value: ATMOSPHERE_DEFAULTS.rays, min: 0, max: 1, step: 0.01, label: 'light rays' },
      raySpeed: { value: ATMOSPHERE_DEFAULTS.raySpeed, min: 0, max: 1, step: 0.01, label: 'ray speed' },
      stars: { value: ATMOSPHERE_DEFAULTS.stars, min: 0, max: 1, step: 0.01 },

      Dust: folder(
        {
          dustCount: { value: ATMOSPHERE_DEFAULTS.dustCount, min: 0, max: 500, step: 10, label: 'count' },
          dustSize: { value: ATMOSPHERE_DEFAULTS.dustSize, min: 0.5, max: 8, step: 0.1, label: 'size' },
          dustOpacity: { value: ATMOSPHERE_DEFAULTS.dustOpacity, min: 0, max: 1, step: 0.01, label: 'opacity' },
          dustClearance: { value: ATMOSPHERE_DEFAULTS.dustClearance, min: 0, max: 2.5, step: 0.05, label: 'clearance' },
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
