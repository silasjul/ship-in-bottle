export type WaterConfig = {
  fill: number;
  opacity: number;
  edgeFade: number;

  simSpeed: number;
  damping: number;
  rainRate: number;
  dropRadius: number;
  dropStrength: number;
  wakeStrength: number;

  colorShallow: string;
  colorDeep: string;
  depthFalloff: number;
  volumeOpacity: number;
  volumeDensity: number;

  sunColor: string;
  sunElevation: number;
  sunAzimuth: number;

  fresnelF0: number;
  fresnelPower: number;
  reflectivity: number;
  sunGlint: number;
  shininess: number;
};

export const WATER_DEFAULTS: WaterConfig = {
  fill: 0.35,
  opacity: 0.2,
  edgeFade: 0.5,

  simSpeed: 2,
  damping: 0.992,
  rainRate: 0,
  dropRadius: 0.31,
  dropStrength: 0.225,
  wakeStrength: 0.15,

  colorShallow: '#2e8c9e',
  colorDeep: '#0d3b4a',
  depthFalloff: 1.2,
  volumeOpacity: 0.32,
  volumeDensity: 1.6,

  sunColor: '#fff2d0',
  sunElevation: 42,
  sunAzimuth: -35,

  fresnelF0: 0.12,
  fresnelPower: 3.0,
  reflectivity: 0.75,
  sunGlint: 1.5,
  shininess: 1200,
};
