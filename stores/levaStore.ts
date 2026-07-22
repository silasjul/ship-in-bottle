import { create } from 'zustand';
import { CUBE_DEFAULTS, type CubeConfig } from '@/configs/cubeConfig';

interface LevaState {
  cube: CubeConfig;
  setCube: (cube: CubeConfig) => void;
}

export const useLevaStore = create<LevaState>((set) => ({
  cube: CUBE_DEFAULTS,
  setCube: (cube) => set({ cube }),
}));
