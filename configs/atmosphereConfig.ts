export type AtmosphereConfig = {
  colorTop: string;
  colorBottom: string;
  glowColor: string;
  glowIntensity: number;
  glowSize: number;
  haze: number;
  drift: number;
  rays: number;
  raySpeed: number;
  stars: number;
  dustCount: number;
  dustSize: number;
  dustOpacity: number;
  dustClearance: number;
};

export const ATMOSPHERE_DEFAULTS: AtmosphereConfig = {
  colorTop: '#0c1530',
  colorBottom: '#030509',
  glowColor: '#ffd9a3',
  glowIntensity: 1.2,
  glowSize: 0.23,
  haze: 0.09,
  drift: 0.25,
  rays: 0.31,
  raySpeed: 0.41,
  stars: 0.3,
  dustCount: 450,
  dustSize: 0.5,
  dustOpacity: 0.08,
  dustClearance: 0,
};
