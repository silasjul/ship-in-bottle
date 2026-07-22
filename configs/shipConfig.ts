export type ShipConfig = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  buoyancy: boolean;
  showWake: boolean;
  wakeLength: number;
  wakeRadius: number;
  wakeYOffset: number;
  wakeYaw: number;
};

// position is an offset from the water cross-section's center.
// Wake capsule values are in ship units (multiplied by scale at runtime);
// wakeLength is the distance between the capsule's endpoint centers.
export const SHIP_DEFAULTS: ShipConfig = {
  position: { x: 0, y: -0.1, z: 0 },
  rotation: { x: 0, y: 90, z: 0 },
  scale: 0.85,
  buoyancy: true,
  showWake: false,
  wakeLength: 2.74,
  wakeRadius: 0.66,
  wakeYOffset: 0.24,
  wakeYaw: 90,
};
