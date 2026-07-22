import { create } from 'zustand';
import { BOTTLE_DEFAULTS, type BottleConfig } from '@/configs/bottleConfig';
import { SHIP_DEFAULTS, type ShipConfig } from '@/configs/shipConfig';
import { WATER_DEFAULTS, type WaterConfig } from '@/configs/waterConfig';
import { RENDER_DEFAULTS, type RenderConfig } from '@/configs/renderConfig';
import { ATMOSPHERE_DEFAULTS, type AtmosphereConfig } from '@/configs/atmosphereConfig';
import { EFFECTS_DEFAULTS, type EffectsConfig } from '@/configs/effectsConfig';

interface LevaState {
  bottle: BottleConfig;
  setBottle: (bottle: BottleConfig) => void;
  ship: ShipConfig;
  setShip: (ship: ShipConfig) => void;
  water: WaterConfig;
  setWater: (water: WaterConfig) => void;
  render: RenderConfig;
  setRender: (render: RenderConfig) => void;
  atmosphere: AtmosphereConfig;
  setAtmosphere: (atmosphere: AtmosphereConfig) => void;
  effects: EffectsConfig;
  setEffects: (effects: EffectsConfig) => void;
}

export const useLevaStore = create<LevaState>((set) => ({
  bottle: BOTTLE_DEFAULTS,
  setBottle: (bottle) => set({ bottle }),
  ship: SHIP_DEFAULTS,
  setShip: (ship) => set({ ship }),
  water: WATER_DEFAULTS,
  setWater: (water) => set({ water }),
  render: RENDER_DEFAULTS,
  setRender: (render) => set({ render }),
  atmosphere: ATMOSPHERE_DEFAULTS,
  setAtmosphere: (atmosphere) => set({ atmosphere }),
  effects: EFFECTS_DEFAULTS,
  setEffects: (effects) => set({ effects }),
}));
