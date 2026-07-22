import { useEffect } from 'react';
import { folder, useControls } from 'leva';
import { WATER_DEFAULTS } from '@/configs/waterConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useWaterTweaks() {
  const setConfig = useLevaStore((s) => s.setWater);

  const values = useControls(
    'Water',
    {
      fill: { value: WATER_DEFAULTS.fill, min: 0.1, max: 0.9, step: 0.01, label: 'water level' },
      opacity: { value: WATER_DEFAULTS.opacity, min: 0.2, max: 1, step: 0.01 },
      edgeFade: { value: WATER_DEFAULTS.edgeFade, min: 0.1, max: 4, step: 0.05, label: 'edge fade' },

      Ripples: folder(
        {
          simSpeed: { value: WATER_DEFAULTS.simSpeed, min: 1, max: 4, step: 1, label: 'wave speed' },
          damping: { value: WATER_DEFAULTS.damping, min: 0.97, max: 0.999, step: 0.001 },
          rainRate: { value: WATER_DEFAULTS.rainRate, min: 0, max: 20, step: 0.5, label: 'rain drops/s' },
          dropRadius: { value: WATER_DEFAULTS.dropRadius, min: 0.05, max: 1.5, step: 0.01, label: 'drop radius' },
          dropStrength: { value: WATER_DEFAULTS.dropStrength, min: 0, max: 0.5, step: 0.005, label: 'drop strength' },
          wakeStrength: { value: WATER_DEFAULTS.wakeStrength, min: 0, max: 5, step: 0.05, label: 'ship wake' },
        },
        { collapsed: true }
      ),

      Color: folder(
        {
          colorShallow: { value: WATER_DEFAULTS.colorShallow, label: 'shallow' },
          colorDeep: { value: WATER_DEFAULTS.colorDeep, label: 'deep' },
          depthFalloff: { value: WATER_DEFAULTS.depthFalloff, min: 0.1, max: 5, step: 0.05, label: 'depth falloff' },
          volumeOpacity: { value: WATER_DEFAULTS.volumeOpacity, min: 0, max: 1, step: 0.01, label: 'body opacity' },
          volumeDensity: { value: WATER_DEFAULTS.volumeDensity, min: 0.1, max: 8, step: 0.05, label: 'body density' },
          sunColor: { value: WATER_DEFAULTS.sunColor, label: 'sun' },
          sunElevation: { value: WATER_DEFAULTS.sunElevation, min: 5, max: 90, step: 1, label: 'sun elevation' },
          sunAzimuth: { value: WATER_DEFAULTS.sunAzimuth, min: -180, max: 180, step: 1, label: 'sun azimuth' },
        },
        { collapsed: true }
      ),

      Reflection: folder(
        {
          fresnelF0: { value: WATER_DEFAULTS.fresnelF0, min: 0, max: 0.5, step: 0.01, label: 'base reflect' },
          fresnelPower: { value: WATER_DEFAULTS.fresnelPower, min: 0.5, max: 8, step: 0.1, label: 'fresnel power' },
          reflectivity: { value: WATER_DEFAULTS.reflectivity, min: 0, max: 1.5, step: 0.01 },
          sunGlint: { value: WATER_DEFAULTS.sunGlint, min: 0, max: 5, step: 0.05, label: 'sun glint' },
          shininess: { value: WATER_DEFAULTS.shininess, min: 50, max: 5000, step: 10 },
        },
        { collapsed: true }
      ),
    },
    { collapsed: false }
  );

  useEffect(() => {
    setConfig(values);
  }, [setConfig, values]);
}
