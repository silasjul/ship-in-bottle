export type BottleModelTransform = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
};

export type BottleConfig = {
  position: { x: number; y: number; z: number };
  scale: number;
  model: BottleModelTransform;
};

export const BOTTLE_DEFAULTS: BottleConfig = {
  position: { x: 0, y: 0, z: 0 },
  scale: 0.3,
  // The glb's root node lays the bottle along +z; y 90 turns it onto +x,
  // the axis the water simulation runs along.
  model: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: 1,
  },
};
