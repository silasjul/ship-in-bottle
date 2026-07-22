export type CubeConfig = {
  color: string;
  rotationSpeed: number;
  scale: number;
  wireframe: boolean;
};

export const CUBE_DEFAULTS: CubeConfig = {
  color: 'royalblue',
  rotationSpeed: 0.5,
  scale: 1,
  wireframe: false,
};
