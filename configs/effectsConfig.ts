export type EffectsConfig = {
  enabled: boolean;
  bloom: number;
  bloomThreshold: number;
  vignette: number;
  vignetteOffset: number;
  grain: number;
  fringe: number;
};

export const EFFECTS_DEFAULTS: EffectsConfig = {
  enabled: true,
  bloom: 0.3,
  bloomThreshold: 0.59,
  vignette: 0.53,
  vignetteOffset: 0.32,
  grain: 0.2,
  fringe: 0.0011,
};
